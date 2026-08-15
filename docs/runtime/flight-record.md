# FlightRecord

**Source:** `src/lib/flightRecord.js`

The recording itself. Pure functions, no React, no Three.js.

## Shape

```js
{
  runId: string,
  modelId: string,
  prompt: string,
  startedAt: number,          // performance.now()
  firstTokenAt: number|null,
  finishedAt: number|null,
  tokens: Array<{
    text: string,
    at: number,
    logprob: number|null,
    alternatives: Array<{ token: string, logprob: number }>,
  }>,
  usage: object|null,         // WebLLM usage blob
}
```

## API

```js
createFlightRecord({ runId, modelId, prompt, startedAt })
appendToken(record, event)          // returns a new record; stamps firstTokenAt once
finishRecord(record, usage, finishedAt)
interTokenLatenciesMs(record)       // gaps between consecutive token timestamps
summarizeRecord(record)
```

## summarizeRecord

| Field | Derivation |
| --- | --- |
| `ttftMs` | Prefer `usage.extra.time_to_first_token_s * 1000`, else `firstTokenAt - startedAt` |
| `itlMsP50` / `itlMsP95` | Nearest-rank percentile of inter-token gaps |
| `tokensOut` | `tokens.length` |
| `tokPerS` | Prefer `usage.extra.decode_tokens_per_s`, else `(tokensOut - 1) / decodeMs * 1000` |
| `promptTokens` | `usage.prompt_tokens` when present |
| `wallMs` | `finishedAt - startedAt` (falls back to last token time) |
| `itl` | Raw gap array |

Rounding goes through `roundTo` in `telemetry.js`.

## Why usage wins when present

WebLLM's latency breakdown is measured inside the engine. The client-side
`performance.now()` stamps include event-loop jitter between the worker and the
main thread. Preferring the engine numbers keeps the receipt closer to what the
runtime actually observed, while the client stamps remain available for the
per-token corridor (which needs a timestamp on every token, not just a summary).
