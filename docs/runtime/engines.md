# Engines

**Sources:** `src/lib/engine/createEngine.js`, `webllmEngine.js`, `mockEngine.js`,
`src/webllm.worker.js`

## createEngine(kind)

```js
if (kind === "mock" || shouldUseMock(kind)) return createMockEngine();
const { createWebllmEngine } = await import("./webllmEngine.js");
return createWebllmEngine();
```

`shouldUseMock` is true when:

- `import.meta.env.MODE === "test"`, or
- the URL has `?engine=mock`

The dynamic import keeps `@mlc-ai/web-llm` out of the initial bundle.

## WebLLM engine

```js
{
  kind: "webllm",
  load(modelId, onProgress),
  generate({ messages, onToken, onUsage, maxTokens }),
  interrupt(),
  unload(),
}
```

`load` spins a module worker (`webllm.worker.js`) and calls
`CreateWebWorkerMLCEngine`. Progress reports are mapped to phase events:
anything whose text mentions "compil" or "shader" becomes `COMPILE_START`,
otherwise `DOWNLOAD_PROGRESS`.

`generate` requests:

```js
{
  stream: true,
  stream_options: { include_usage: true },
  logprobs: true,
  top_logprobs: 3,
  enable_latency_breakdown: true,
  max_tokens: 96,
  temperature: 0.7,
}
```

Each streamed chunk with content becomes:

```js
onToken({
  text,
  at: performance.now(),
  logprob: choice.logprobs.content[0].logprob ?? null,
  alternatives: top_logprobs.map(({ token, logprob }) => ({ token, logprob })),
})
```

`unload` calls `engine.unload()` and terminates the worker.

## Mock engine

Deterministic. Never downloads weights. Used by Vitest and by anyone opening
`?engine=mock`.

Default stream: `["Flight", " strip", " locked", ".", " TTFT", " marked", "."]`
with TTFT 180 ms and ITL 40 ms. Accepts a manual clock so tests can advance
time without waiting on `setTimeout`.

Alternatives are synthetic but shaped like WebLLM's: the chosen token plus two
runners-up with lower logprobs.

## Worker bootstrap

`webllm.worker.js` is three lines: import `WebWorkerMLCEngineHandler`, forward
`onmessage`. Vite is configured with `worker.format = "es"` so the worker stays
an ES module.
