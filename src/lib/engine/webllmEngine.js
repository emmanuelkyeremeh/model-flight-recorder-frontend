import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { PHASE_EVENT } from "../phases.js";

const DEFAULT_MAX_TOKENS = 96;
const DEFAULT_TOP_LOGPROBS = 3;

function mapInitProgress(report) {
  const detail = report.text ?? "Loading model.";
  const lower = detail.toLowerCase();
  const compiling = lower.includes("compil") || lower.includes("shader");
  return {
    event: compiling ? PHASE_EVENT.COMPILE_START : PHASE_EVENT.DOWNLOAD_PROGRESS,
    progress: report.progress,
    timeElapsed: report.timeElapsed,
    detail,
  };
}

export function createWebllmEngine() {
  let engine = null;
  let worker = null;

  return {
    kind: "webllm",
    async load(modelId, onProgress) {
      await unloadInternal();
      worker = new Worker(new URL("../../webllm.worker.js", import.meta.url), {
        type: "module",
      });
      engine = await CreateWebWorkerMLCEngine(worker, modelId, {
        initProgressCallback: (report) => {
          onProgress?.(mapInitProgress(report));
        },
      });
    },
    async generate({ messages, onToken, onUsage, maxTokens = DEFAULT_MAX_TOKENS }) {
      if (!engine) {
        throw new Error("WebLLM engine is not armed.");
      }

      const chunks = await engine.chat.completions.create({
        messages,
        stream: true,
        stream_options: { include_usage: true },
        logprobs: true,
        top_logprobs: DEFAULT_TOP_LOGPROBS,
        enable_latency_breakdown: true,
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      for await (const chunk of chunks) {
        const choice = chunk.choices?.[0];
        const text = choice?.delta?.content;
        if (text) {
          const logprob = choice?.logprobs?.content?.[0]?.logprob ?? null;
          const alternatives = (choice?.logprobs?.content?.[0]?.top_logprobs ?? []).map((entry) => ({
            token: entry.token,
            logprob: entry.logprob,
          }));
          onToken({
            text,
            at: performance.now(),
            logprob,
            alternatives,
          });
        }
        if (chunk.usage) {
          onUsage?.(chunk.usage);
        }
      }
    },
    interrupt() {
      engine?.interruptGenerate();
    },
    async unload() {
      await unloadInternal();
    },
  };

  async function unloadInternal() {
    if (engine) {
      await engine.unload();
      engine = null;
    }
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }
}
