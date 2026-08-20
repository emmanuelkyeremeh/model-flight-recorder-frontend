import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalyticsPanel } from "./components/AnalyticsPanel.jsx";
import { FlightBrief } from "./components/FlightBrief.jsx";
import { FlightScene } from "./components/FlightScene.jsx";
import { PromptDock } from "./components/PromptDock.jsx";
import { ReadingPanel } from "./components/ReadingPanel.jsx";
import { SceneControls } from "./components/SceneControls.jsx";
import { TokenInspector } from "./components/TokenInspector.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { Transport } from "./components/Transport.jsx";
import { useRecorder } from "./hooks/useRecorder.js";
import { useTheme } from "./hooks/useTheme.js";
import { buildCorridor, corridorEvents } from "./lib/corridor.js";
import { isRecordingPhase, isTransferPhase, PHASE, phaseLabel } from "./lib/phases.js";

const EMPTY_CORRIDOR = { waypoints: [], alternates: [], length: 0 };

/**
 * How much of the vocabulary field is lit. The space fills in as the weights
 * arrive, so downloading a model is something you watch happen rather than a
 * progress bar you wait behind.
 */
function revealFor(phase) {
  if (phase.name === PHASE.COLD || phase.name === PHASE.FAULT) {
    return 0.5;
  }
  if (isTransferPhase(phase.name)) {
    return 0.5 + 0.5 * (phase.progress ?? 0);
  }
  return 1;
}

export function App({ engineFactory, detectGpu } = {}) {
  const recorder = useRecorder({ engineFactory, detectGpu });
  const { theme, toggleTheme } = useTheme();
  const recording = isRecordingPhase(recorder.phase.name);
  const loading = isTransferPhase(recorder.phase.name);

  const [view, setView] = useState("flight");
  const [selected, setSelected] = useState(0);
  const [candidate, setCandidate] = useState(null);
  const [follow, setFollow] = useState(true);
  const sceneRef = useRef(null);

  const analysis = recorder.analysis;
  const frames = analysis?.frames ?? [];
  const hasRun = frames.length > 0;

  const corridor = useMemo(() => (
    hasRun
      ? buildCorridor(frames, { cadenceMs: analysis?.itlMsP50 ?? 20 })
      : EMPTY_CORRIDOR
  ), [analysis?.itlMsP50, frames, hasRun]);

  const events = useMemo(
    () => (recorder.phase.name === PHASE.COMPLETE ? corridorEvents(analysis, corridor) : []),
    [analysis, corridor, recorder.phase.name],
  );

  /* While tokens are arriving the camera rides the newest one, until the
     viewer takes the controls by scrubbing or clicking a token. */
  useEffect(() => {
    if (recording && follow && frames.length > 0) {
      setSelected(frames.length - 1);
    }
  }, [follow, frames.length, recording]);

  useEffect(() => {
    if (recorder.phase.name === PHASE.PREFILL) {
      setFollow(true);
      setView("flight");
    }
  }, [recorder.phase.name]);

  useEffect(() => {
    if (!hasRun) {
      sceneRef.current?.rest();
    }
  }, [hasRun]);

  /* A plain selection — scrubbing the transport, clicking a transcript token —
     hands off to the scene, which glides the camera onto the token at the current
     distance. It travels without changing how close you are reading. */
  const select = useCallback((index, candidate = null) => {
    setFollow(false);
    setSelected(index);
    setCandidate(candidate);
  }, []);

  /* Clicking a node in the scene is a stronger gesture: fly to it and pull in
     close, the same framing the finding chips use. A clicked candidate keeps its
     name so the readout can point at that row. */
  const pickInScene = useCallback((index, candidate = null) => {
    setFollow(false);
    setSelected(index);
    setCandidate(candidate);
    sceneRef.current?.flyTo(index);
  }, []);

  const flyTo = useCallback((index) => {
    setFollow(false);
    setSelected(index);
    setCandidate(null);
    sceneRef.current?.flyTo(index);
  }, []);

  const clamped = Math.min(Math.max(selected, 0), Math.max(0, frames.length - 1));
  const frame = frames[clamped] ?? null;
  const drawnTokens = sceneRef.current?.drawnTokens ?? null;

  const zoomIn = useCallback(() => sceneRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => sceneRef.current?.zoomOut(), []);
  const orbit = useCallback(
    (deltaTheta, deltaPhi) => sceneRef.current?.orbit(deltaTheta, deltaPhi),
    [],
  );
  const level = useCallback(() => sceneRef.current?.level(), []);

  /* With a route on screen, recentring means the token you are reading. With an
     empty field there is no subject, so it means the opening framing. */
  const recentre = useCallback(() => {
    if (hasRun) {
      flyTo(clamped);
    } else {
      sceneRef.current?.rest();
    }
  }, [clamped, flyTo, hasRun]);

  return (
    <div className="app">
      <FlightScene
        corridor={corridor}
        selected={clamped}
        follow={follow}
        reveal={revealFor(recorder.phase)}
        busy={loading || recording}
        vocabTokens={recorder.model.vocabTokens}
        theme={theme}
        onSelect={pickInScene}
        sceneRef={sceneRef}
      />

      <TopBar
        phase={recorder.phase}
        recording={recording}
        view={view}
        onView={setView}
        receipt={recorder.receipt}
        hasRun={hasRun}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {view === "flight" ? (
        <>
          {hasRun ? (
            <>
              <TokenInspector
                frame={frame}
                total={frames.length}
                analysis={analysis}
                candidate={candidate}
              />
              <ReadingPanel
                frames={frames}
                selected={clamped}
                onSelect={select}
                live={recording}
              />
              <Transport
                total={frames.length}
                selected={clamped}
                onSelect={select}
                events={events}
                onFly={flyTo}
                follow={follow}
                onFollow={setFollow}
                recording={recording}
              />
            </>
          ) : (
            <FlightBrief
              model={recorder.model}
              drawnTokens={drawnTokens}
              phaseName={phaseLabel(recorder.phase.name)}
              detail={loading ? null : recorder.phase.detail}
            />
          )}

          <SceneControls
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onOrbit={orbit}
            onLevel={level}
            onRecentre={recentre}
          />

          <PromptDock
            model={recorder.model}
            prompt={recorder.prompt}
            onPromptChange={recorder.setPrompt}
            onSelect={recorder.selectModel}
            onArm={recorder.arm}
            onRun={recorder.run}
            canArm={recorder.canArm}
            canRun={recorder.canRun}
            recording={recording}
            loading={loading}
            phaseName={recorder.phase.name}
            loadPercent={recorder.phase.transfer?.percent ?? 0}
            loadedModelId={recorder.loadedModelId}
          />
        </>
      ) : (
        <AnalyticsPanel
          analysis={analysis}
          model={recorder.model}
          engineKind={recorder.engineKind}
          selected={clamped}
          onSelect={select}
          theme={theme}
        />
      )}
    </div>
  );
}
