# Model catalog

**Source:** `src/lib/catalog.js`

Curated WebLLM allowlist. Not every MLC model: only the ones sized for a
laptop with an explicit consent step.

| Id | Label | Vocab | Download | VRAM | Notes |
| --- | --- | --- | --- | --- | --- |
| `SmolLM2-360M-Instruct-q4f16_1-MLC` | SmolLM2 360M | 49,152 | 204 MB | 376 MB | Default |
| `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | Qwen2.5 0.5B | 151,936 | 278 MB | 945 MB | |
| `Llama-3.2-1B-Instruct-q4f16_1-MLC` | Llama 3.2 1B | 128,256 | 695 MB | 879 MB | Warning |
| `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | Qwen2.5 1.5B | 151,936 | 869 MB | 1630 MB | Stress warning |

`vocabTokens` is the published `vocab_size` from each model's config.json. The
field draws that many points (capped by `fieldBudget`). Download sizes are
approximate weight payloads from MLC ndarray-cache measurements; VRAM figures
come from WebLLM's `prebuiltAppConfig`.

```js
getModelById(id)      // throws on unknown
getDefaultModel()
isStressModel(model)  // true when model.warning is set
```
