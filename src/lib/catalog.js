export const DEFAULT_MODEL_ID = "SmolLM2-360M-Instruct-q4f16_1-MLC";

/**
 * Curated WebLLM allowlist. Download sizes are approximate weight payloads
 * from MLC ndarray-cache measurements; VRAM is from WebLLM prebuiltAppConfig.
 * vocabTokens is the `vocab_size` field of each model's published config.json —
 * the count of tokens the model chooses between at every single step.
 */
export const MODEL_CATALOG = Object.freeze([
  {
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    label: "SmolLM2 360M",
    vocabTokens: 49152,
    quant: "q4f16",
    downloadMb: 204,
    vramMb: 376,
    requiresShaderF16: true,
    tier: "default",
    warning: null,
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label: "Qwen2.5 0.5B",
    vocabTokens: 151936,
    quant: "q4f16",
    downloadMb: 278,
    vramMb: 945,
    requiresShaderF16: false,
    tier: "quality",
    warning: null,
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 1B",
    vocabTokens: 128256,
    quant: "q4f16",
    downloadMb: 695,
    vramMb: 879,
    requiresShaderF16: false,
    tier: "mid",
    warning: "Longer download. Confirm you want ~700MB on this device.",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen2.5 1.5B",
    vocabTokens: 151936,
    quant: "q4f16",
    downloadMb: 869,
    vramMb: 1630,
    requiresShaderF16: false,
    tier: "stress",
    warning: "Stress model. Desktop Chrome recommended; may OOM on laptops with many tabs.",
  },
]);

export function getModelById(modelId) {
  const model = MODEL_CATALOG.find((entry) => entry.id === modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return model;
}

export function getDefaultModel() {
  return getModelById(DEFAULT_MODEL_ID);
}

export function isStressModel(model) {
  return Boolean(model.warning);
}
