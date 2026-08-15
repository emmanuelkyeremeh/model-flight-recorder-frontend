import { deriveTransfer } from "./transfer.js";

export const PHASE = Object.freeze({
  COLD: "COLD",
  FUELING: "FUELING",
  COMPILING: "COMPILING",
  ARMED: "ARMED",
  PREFILL: "PREFILL",
  RECORDING: "RECORDING",
  COMPLETE: "COMPLETE",
  FAULT: "FAULT",
});

/* The word shown in the masthead. It is the accessible second channel for
   phase, so state never rests on the lamp colour alone. */
export const PHASE_LABEL = Object.freeze({
  [PHASE.COLD]: "IDLE",
  [PHASE.FUELING]: "DOWNLOADING",
  [PHASE.COMPILING]: "COMPILING",
  [PHASE.ARMED]: "READY",
  [PHASE.PREFILL]: "PREFILL",
  [PHASE.RECORDING]: "RECORDING",
  [PHASE.COMPLETE]: "COMPLETE",
  [PHASE.FAULT]: "FAULT",
});

export function phaseLabel(name) {
  return PHASE_LABEL[name] ?? name;
}

export const PHASE_EVENT = Object.freeze({
  DOWNLOAD_START: "DOWNLOAD_START",
  DOWNLOAD_PROGRESS: "DOWNLOAD_PROGRESS",
  COMPILE_START: "COMPILE_START",
  ARMED: "ARMED",
  RUN_START: "RUN_START",
  FIRST_TOKEN: "FIRST_TOKEN",
  RUN_COMPLETE: "RUN_COMPLETE",
  FAULT: "FAULT",
  RESET: "RESET",
});

export function createPhaseState() {
  return {
    name: PHASE.COLD,
    detail: "Nothing loaded. Downloading starts only when you confirm.",
    progress: null,
    fault: null,
    transfer: null,
  };
}

export function reducePhase(state, event, payload = {}) {
  switch (event) {
    case PHASE_EVENT.DOWNLOAD_START:
      return {
        name: PHASE.FUELING,
        detail: payload.detail ?? "Downloading model weights.",
        progress: 0,
        fault: null,
        transfer: deriveTransfer({
          progress: 0,
          timeElapsed: 0,
          text: payload.detail ?? "Start to fetch params",
          totalMb: payload.totalMb ?? state.transfer?.totalMb ?? 0,
        }),
      };
    case PHASE_EVENT.DOWNLOAD_PROGRESS:
      return withTransfer(state, {
        name: looksLikeCompile(payload.detail) ? PHASE.COMPILING : PHASE.FUELING,
        detail: payload.detail ?? state.detail,
        progress: clampProgress(payload.progress),
        fault: null,
      }, payload);
    case PHASE_EVENT.COMPILE_START:
      return withTransfer(state, {
        name: PHASE.COMPILING,
        detail: payload.detail ?? "Compiling WebGPU shaders (one-time per model/device).",
        progress: payload.progress ?? state.progress,
        fault: null,
      }, payload);
    case PHASE_EVENT.ARMED:
      return {
        name: PHASE.ARMED,
        detail: payload.detail ?? "Loaded. Write a prompt and run it.",
        progress: 1,
        fault: null,
        transfer: null,
      };
    case PHASE_EVENT.RUN_START:
      return {
        name: PHASE.PREFILL,
        detail: "Prompt sent — waiting on the first token.",
        progress: 1,
        fault: null,
        transfer: null,
      };
    case PHASE_EVENT.FIRST_TOKEN:
      return {
        name: PHASE.RECORDING,
        detail: "Recording — timing every token.",
        progress: 1,
        fault: null,
        transfer: null,
      };
    case PHASE_EVENT.RUN_COMPLETE:
      return {
        name: PHASE.COMPLETE,
        detail: "Run complete. The recording is fixed.",
        progress: 1,
        fault: null,
        transfer: null,
      };
    case PHASE_EVENT.FAULT:
      return {
        name: PHASE.FAULT,
        detail: payload.detail ?? "Fault.",
        progress: state.progress,
        fault: payload.fault ?? payload.detail ?? "Unknown fault.",
        transfer: state.transfer,
      };
    case PHASE_EVENT.RESET:
      return createPhaseState();
    default: {
      const exhaustive = event;
      throw new Error(`Unhandled phase event: ${exhaustive}`);
    }
  }
}

export function isRecordingPhase(name) {
  return name === PHASE.PREFILL || name === PHASE.RECORDING;
}

export function isTransferPhase(name) {
  return name === PHASE.FUELING || name === PHASE.COMPILING;
}

function withTransfer(state, next, payload) {
  return {
    ...next,
    transfer: deriveTransfer({
      progress: next.progress ?? 0,
      timeElapsed: payload.timeElapsed,
      text: payload.detail ?? next.detail,
      totalMb: payload.totalMb ?? state.transfer?.totalMb ?? 0,
    }),
  };
}

function clampProgress(progress) {
  if (typeof progress !== "number" || Number.isNaN(progress)) {
    return null;
  }
  return Math.min(1, Math.max(0, progress));
}

function looksLikeCompile(detail) {
  if (typeof detail !== "string") {
    return false;
  }
  const lower = detail.toLowerCase();
  return lower.includes("compil") || lower.includes("shader");
}
