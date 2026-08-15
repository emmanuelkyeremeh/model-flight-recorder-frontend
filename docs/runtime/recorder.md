# useRecorder

**Source:** `src/hooks/useRecorder.js`

The single React hook that owns the run. Components call `arm` and `run`; they
never talk to WebLLM directly.

## State it holds

| Field | Meaning |
| --- | --- |
| `phase` | Current phase object from `reducePhase` |
| `model` | Selected catalog entry |
| `prompt` / `setPrompt` | Prompt text |
| `reply` | Concatenated completion text (for display only) |
| `record` | Live `FlightRecord` |
| `receipt` | Validated receipt after `COMPLETE`, else `null` |
| `summary` | `summarizeRecord(record)` via `useMemo` |
| `analysis` | `analyzeFlight(record)` via `useMemo` |
| `gpu` | Result of `detectWebGpu()` |
| `engineKind` | `"webllm"` or `"mock"` |
| `canArm` / `canRun` | Button enablement derived from phase + prompt |

## arm()

1. Clears previous receipt/record/reply.
2. Dispatches `DOWNLOAD_START`.
3. Detects WebGPU. If missing and `?engine=mock` is not set, faults.
4. Unloads any previous engine.
5. `createEngine(wantsMock ? "mock" : "webllm")`.
6. `engine.load(model.id, onProgress)` — progress events feed the phase machine.
7. Dispatches `ARMED` on success, `FAULT` on failure.

WebLLM is dynamically imported inside `createEngine`, so the landing bundle
stays free of the WASM/WebGPU engine until the user consents.

## run()

Only legal from `ARMED` or `COMPLETE`.

1. Creates a fresh `FlightRecord` with `performance.now()` as `startedAt`.
2. Dispatches `RUN_START` → phase becomes `PREFILL`.
3. Calls `engine.generate({ messages, onToken, onUsage })`.
4. First `onToken` dispatches `FIRST_TOKEN` → `RECORDING`.
5. Every token: `appendToken`, `setRecord`, append to `reply`.
6. On finish: `finishRecord`, `buildReceipt`, `RUN_COMPLETE`.
7. On error: `FAULT`.

`recordRef` mirrors `record` so the streaming callback always appends to the
latest value without waiting for a React render.

## Injection points for tests

```js
useRecorder({
  engineFactory: async () => createMockEngine({ clock }),
  detectGpu: async () => ({ available: true, vendor: "test", device: null, reason: null }),
})
```

`App` forwards the same options, which is how `App.test.jsx` runs a full
download → run → analytics flow without WebGPU.
