# Model catalog

**Source:** `src/lib/catalog.js`

Curated WebLLM allowlist. Not every MLC model: only the ones sized for a
laptop with an explicit consent step. Option labels show download size and
estimated VRAM so you can match them to the GPU / RAM strip above the dock.

| Id | Label | Vocab | Download | VRAM | Notes |
| --- | --- | --- | --- | --- | --- |
| `SmolLM2-135M-Instruct-q0f16-MLC` | SmolLM2 135M | 49,152 | 269 MB | 360 MB | Tiny; fp16 (no q4 build) |
| `SmolLM2-360M-Instruct-q4f16_1-MLC` | SmolLM2 360M | 49,152 | 204 MB | 376 MB | Default |
| `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | Qwen2.5 0.5B | 151,936 | 278 MB | 945 MB | |
| `Qwen3-0.6B-q4f16_1-MLC` | Qwen3 0.6B | 151,936 | 335 MB | 1403 MB | |
| `gemma3-1b-it-q4f16_1-MLC` | Gemma 3 1B | 262,144 | 563 MB | 711 MB | Large vocab; field is sampled |
| `Llama-3.2-1B-Instruct-q4f16_1-MLC` | Llama 3.2 1B | 128,256 | 695 MB | 879 MB | Warning |
| `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | Qwen2.5 1.5B | 151,936 | 869 MB | 1630 MB | Stress warning |
| `SmolLM2-1.7B-Instruct-q4f16_1-MLC` | SmolLM2 1.7B | 49,152 | 963 MB | 1774 MB | Stress warning |
| `Llama-3.2-3B-Instruct-q4f16_1-MLC` | Llama 3.2 3B | 128,256 | 1807 MB | 2264 MB | Stress warning |

`vocabTokens` is the published `vocab_size` from each model's config.json. The
field draws up to `fieldBudget` points (capped by device class). Download sizes
are approximate weight payloads from Hugging Face / MLC tree sizes; VRAM figures
come from WebLLM's `prebuiltAppConfig`.

Hardware shown in the UI (`detectDevice` in `src/lib/webgpu.js`):
- **GPU** — WebGPU `adapter.info` (vendor / architecture / description)
- **RAM** — `navigator.deviceMemory` (coarse 2/4/8/16/32 estimate; may be missing)
- **VRAM** — never exposed by browsers; use the catalog VRAM column as a guide

```js
getModelById(id)      // throws on unknown
getDefaultModel()
isStressModel(model)  // true when model.warning is set
formatModelOption(model)
```
