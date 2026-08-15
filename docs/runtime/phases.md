# Phase machine

**Source:** `src/lib/phases.js`

The masthead shows a word (`IDLE`, `DOWNLOADING`, `READY`, …) and a lamp. The
word is the accessible second channel: state is never communicated by colour
alone.

## States

```
COLD → FUELING → COMPILING → ARMED → PREFILL → RECORDING → COMPLETE
  │                                         ↑______________|
  └──────────────────► FAULT ◄─────────────────────────────┘
```

| Phase | Label | Meaning |
| --- | --- | --- |
| `COLD` | IDLE | Nothing loaded. No download has started. |
| `FUELING` | DOWNLOADING | Weights are being fetched. |
| `COMPILING` | COMPILING | WebGPU shaders are compiling (one-time per model/device). |
| `ARMED` | READY | Model is in memory. Prompt can run. |
| `PREFILL` | PREFILL | Prompt sent; waiting on the first token. |
| `RECORDING` | RECORDING | Tokens are streaming; every one is timed. |
| `COMPLETE` | COMPLETE | Run finished. Recording is fixed. |
| `FAULT` | FAULT | Something failed. Detail is in `phase.fault`. |

## Events

`reducePhase(state, event, payload)` is a pure reducer. Unhandled events throw
(exhaustive switch with a `never`-style default).

| Event | Moves to |
| --- | --- |
| `DOWNLOAD_START` | `FUELING` |
| `DOWNLOAD_PROGRESS` | `FUELING` or `COMPILING` (if the progress text mentions compile/shader) |
| `COMPILE_START` | `COMPILING` |
| `ARMED` | `ARMED` |
| `RUN_START` | `PREFILL` |
| `FIRST_TOKEN` | `RECORDING` |
| `RUN_COMPLETE` | `COMPLETE` |
| `FAULT` | `FAULT` |
| `RESET` | `COLD` |

## Transfer telemetry

While fueling or compiling, `phase.transfer` holds parsed download progress
(percent, fetched MB, rate, ETA, shard index). Parsing lives in
`src/lib/transfer.js` and understands WebLLM's progress text shapes.

## Helpers

```js
isRecordingPhase(name)  // PREFILL or RECORDING
isTransferPhase(name)   // FUELING or COMPILING
phaseLabel(name)        // human word for the masthead
```

`App.jsx` uses these to dim the field during transfer (`revealFor`), mark the
scene busy during transfer/recording, and decide when finding chips appear
(only in `COMPLETE`).
