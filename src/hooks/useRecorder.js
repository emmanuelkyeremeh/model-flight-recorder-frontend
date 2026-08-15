import { useCallback, useMemo, useRef, useState } from "react";
import { analyzeFlight } from "../lib/analyzeFlight.js";
import { getDefaultModel, getModelById } from "../lib/catalog.js";
import { createEngine } from "../lib/engine/createEngine.js";
import { appendToken, createFlightRecord, finishRecord, summarizeRecord } from "../lib/flightRecord.js";
import { createPhaseState, PHASE, PHASE_EVENT, reducePhase } from "../lib/phases.js";
import { buildReceipt } from "../lib/receipt.js";
import { describeBrowser, detectWebGpu } from "../lib/webgpu.js";

const DEFAULT_PROMPT = "Explain time-to-first-token vs inter-token latency in one short paragraph.";

function createRunId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}`;
}

export function useRecorder({ engineFactory = createEngine, detectGpu = detectWebGpu } = {}) {
  const engineRef = useRef(null);
  const recordRef = useRef(null);
  const [phase, setPhase] = useState(createPhaseState);
  const [model, setModel] = useState(getDefaultModel);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [reply, setReply] = useState("");
  const [record, setRecord] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [gpu, setGpu] = useState(null);
  const [engineKind, setEngineKind] = useState("webllm");

  const summary = useMemo(() => (record ? summarizeRecord(record) : null), [record]);
  const analysis = useMemo(() => (record ? analyzeFlight(record) : null), [record]);

  const dispatch = useCallback((event, payload) => {
    setPhase((current) => reducePhase(current, event, payload));
  }, []);

  const selectModel = useCallback((modelId) => {
    setModel(getModelById(modelId));
    setReceipt(null);
    setRecord(null);
    setReply("");
  }, []);

  const arm = useCallback(async () => {
    setReceipt(null);
    setRecord(null);
    setReply("");
    dispatch(PHASE_EVENT.DOWNLOAD_START, {
      detail: `Downloading ${model.label} (~${model.downloadMb}MB).`,
      totalMb: model.downloadMb,
    });

    try {
      const wantsMock = new URLSearchParams(window.location.search).get("engine") === "mock";
      const gpuInfo = await detectGpu();
      setGpu(gpuInfo);

      if (!gpuInfo.available && !wantsMock) {
        dispatch(PHASE_EVENT.FAULT, { fault: gpuInfo.reason, detail: gpuInfo.reason });
        return;
      }

      if (engineRef.current) {
        await engineRef.current.unload();
      }

      const engine = await engineFactory(wantsMock ? "mock" : "webllm");
      engineRef.current = engine;
      setEngineKind(engine.kind);

      await engine.load(model.id, (progress) => {
        dispatch(progress.event, { ...progress, totalMb: model.downloadMb });
      });

      dispatch(PHASE_EVENT.ARMED, { detail: `${model.label} loaded. Weights cached in this browser.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load model.";
      dispatch(PHASE_EVENT.FAULT, { fault: message, detail: message });
    }
  }, [detectGpu, dispatch, engineFactory, model]);

  const run = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || (phase.name !== PHASE.ARMED && phase.name !== PHASE.COMPLETE)) {
      return;
    }

    const startedAt = performance.now();
    const nextRecord = createFlightRecord({
      runId: createRunId(),
      modelId: model.id,
      prompt,
      startedAt,
    });
    recordRef.current = nextRecord;
    setRecord(nextRecord);
    setReply("");
    setReceipt(null);
    dispatch(PHASE_EVENT.RUN_START);

    let sawToken = false;
    let usage = null;

    try {
      await engine.generate({
        messages: [{ role: "user", content: prompt }],
        onToken: (event) => {
          if (!sawToken) {
            sawToken = true;
            dispatch(PHASE_EVENT.FIRST_TOKEN);
          }
          const current = recordRef.current;
          const updated = appendToken(current, event);
          recordRef.current = updated;
          setRecord(updated);
          setReply((text) => text + event.text);
        },
        onUsage: (nextUsage) => {
          usage = nextUsage;
        },
      });

      const finished = finishRecord(recordRef.current, usage, performance.now());
      recordRef.current = finished;
      setRecord(finished);
      setReceipt(buildReceipt(finished, {
        runtime: engine.kind,
        browser: describeBrowser(),
        gpuRenderer: gpu?.vendor ?? gpu?.device ?? null,
      }));
      dispatch(PHASE_EVENT.RUN_COMPLETE);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed.";
      dispatch(PHASE_EVENT.FAULT, { fault: message, detail: message });
    }
  }, [dispatch, gpu, model.id, phase.name, prompt]);

  const canRun = (phase.name === PHASE.ARMED || phase.name === PHASE.COMPLETE) && prompt.trim().length > 0;
  const canArm = phase.name === PHASE.COLD || phase.name === PHASE.ARMED || phase.name === PHASE.COMPLETE || phase.name === PHASE.FAULT;

  return {
    phase,
    model,
    prompt,
    setPrompt,
    reply,
    record,
    receipt,
    summary,
    analysis,
    gpu,
    engineKind,
    selectModel,
    arm,
    run,
    canRun,
    canArm,
  };
}
