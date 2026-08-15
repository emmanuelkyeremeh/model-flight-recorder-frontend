import { describe, expect, it } from "vitest";
import { createPhaseState, PHASE, PHASE_EVENT, phaseLabel, reducePhase } from "./phases.js";

describe("phases", () => {
  it("starts cold with no download", () => {
    const state = createPhaseState();
    expect(state.name).toBe(PHASE.COLD);
    expect(state.progress).toBeNull();
  });

  it("gives every phase a word for the masthead", () => {
    expect(phaseLabel(PHASE.COLD)).toBe("IDLE");
    expect(phaseLabel(PHASE.FUELING)).toBe("DOWNLOADING");
    expect(phaseLabel(PHASE.ARMED)).toBe("READY");
    expect(phaseLabel(PHASE.RECORDING)).toBe("RECORDING");
    expect(phaseLabel(PHASE.FAULT)).toBe("FAULT");
  });

  it("moves through fueling to armed", () => {
    let state = createPhaseState();
    state = reducePhase(state, PHASE_EVENT.DOWNLOAD_START);
    expect(state.name).toBe(PHASE.FUELING);
    state = reducePhase(state, PHASE_EVENT.DOWNLOAD_PROGRESS, { progress: 0.4, detail: "Fetching params", totalMb: 204 });
    expect(state.name).toBe(PHASE.FUELING);
    expect(state.transfer.percent).toBe(40);
    expect(state.transfer.totalMb).toBe(204);
    state = reducePhase(state, PHASE_EVENT.DOWNLOAD_PROGRESS, { progress: 0.9, detail: "Compiling shaders" });
    expect(state.name).toBe(PHASE.COMPILING);
    state = reducePhase(state, PHASE_EVENT.ARMED);
    expect(state.name).toBe(PHASE.ARMED);
  });

  it("records prefill then decode", () => {
    let state = reducePhase(createPhaseState(), PHASE_EVENT.ARMED);
    state = reducePhase(state, PHASE_EVENT.RUN_START);
    expect(state.name).toBe(PHASE.PREFILL);
    state = reducePhase(state, PHASE_EVENT.FIRST_TOKEN);
    expect(state.name).toBe(PHASE.RECORDING);
    state = reducePhase(state, PHASE_EVENT.RUN_COMPLETE);
    expect(state.name).toBe(PHASE.COMPLETE);
  });

  it("stores fault text", () => {
    const state = reducePhase(createPhaseState(), PHASE_EVENT.FAULT, { fault: "No WebGPU" });
    expect(state.name).toBe(PHASE.FAULT);
    expect(state.fault).toBe("No WebGPU");
  });

  it("rejects unknown events", () => {
    expect(() => reducePhase(createPhaseState(), "HOVER")).toThrow(/Unhandled phase event/);
  });
});
