# What it is

Model Flight Recorder is a single-page Vite + React app that runs a small
language model inside the visitor's browser and records every token the model
produces.

It is not a chatbot. The streamed text is a side effect. The product is the
recording: timestamps, log-probabilities, the alternatives the engine reported,
and a 3D scene that turns those numbers into a route you can fly.

## What "local" means here

- Weights are fetched from the MLC CDN into the browser cache, only after an
  explicit click.
- Inference runs in a Web Worker via `@mlc-ai/web-llm` on WebGPU.
- The prompt and the completion never leave the device.
- The optional backend stores **receipts** (metrics JSON), never the text.

## What you can measure

From one run you get:

- Time-to-first-token (TTFT)
- Inter-token latency (ITL) with p50 / p95 / p99, mean, stddev, jitter, tail ratio
- Decode tokens per second
- Prefill vs decode wall-time split
- Per-token probability, logprob, margin to the runner-up
- Perplexity over the reported logprobs
- Findings: stalls, contested picks, low-integrity picks, hardest decision

## What you cannot see

WebLLM exposes top-k logprobs (three by default). It does **not** expose
attention weights, hidden states, or a per-layer logit lens. The UI is honest
about that: the ringed candidates are the ones the engine reported, and the
field is vocabulary at rest, not a reconstructed distribution.

## Who it is for

1. A frontend or AI developer deciding whether a small local model is fast
   enough to ship in a browser product.
2. The author, using it as a real instrument on a 16 GB laptop.
3. An ML-curious learner who wants to see how a model decides, one token at a
   time.

It is judged as a working tool, not as a portfolio piece that only has to
survive a first impression.
