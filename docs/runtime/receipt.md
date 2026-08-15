# Receipts

**Sources:** `src/lib/receipt.js`, `src/shared/receiptSchema.js`

A receipt is the shareable artifact of a completed run. Metrics only. Never the
prompt, never the completion.

## Building

```js
buildReceipt(record, {
  runtime: engine.kind,          // "webllm" mapped to "webgpu"
  browser: describeBrowser(),
  gpuRenderer: gpu?.vendor ?? gpu?.device ?? null,
})
```

`receiptRuntime("webllm")` returns `"webgpu"`. The schema only accepts
`"webgpu"` or `"mock"`.

## Schema (v1)

Required fields:

```
schema_version, app, run_id, model_id, model_size_mb, runtime,
ttft_ms, itl_ms_p50, itl_ms_p95, tokens_out, tok_per_s,
prompt_tokens, wall_ms, network_mode, created_at
```

Hard rules inside `validateReceipt`:

- `app` must be `"ModelFlightRecorder"`
- `schema_version` must be `1`
- `network_mode` must be `"local-only"`
- `runtime` must be `"webgpu"` or `"mock"`
- numeric fields finite and ≥ 0 (nullable metrics may be `null`)
- body ≤ 64 KB when serialized

## Export

`TopBar` calls `downloadText(receiptToJson(receipt), filename)` to trigger a
client-side download. The optional backend accepts the same JSON at
`POST /api/receipts`.

## Why the schema is vendored

Frontend and backend are separate private repos. Each carries its own copy of
`receiptSchema.js`. The frontend aliases it as `@shared` so imports read the
same way they did when both halves lived in one monorepo. Keep the two copies
in sync when you bump `RECEIPT_SCHEMA_VERSION`.
