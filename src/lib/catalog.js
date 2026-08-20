export const DEFAULT_MODEL_ID = "SmolLM2-360M-Instruct-q4f16_1-MLC";

/**
 * Curated WebLLM allowlist. Download sizes are approximate weight payloads
 * from MLC / Hugging Face tree sizes; VRAM is from WebLLM prebuiltAppConfig.
 * vocabTokens is the `vocab_size` field of each model's published config.json —
 * the count of tokens the model chooses between at every single step.
 */
export const MODEL_CATALOG = Object.freeze([
  {
    id: "SmolLM2-135M-Instruct-q0f16-MLC",
    label: "SmolLM2 135M",
    vocabTokens: 49152,
    quant: "q0f16",
    downloadMb: 269,
    vramMb: 360,
    requiresShaderF16: true,
    tier: "tiny",
    warning: "Unquantized fp16 build — similar VRAM to 360M q4, smaller parameter count.",
  },
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
    id: "Qwen3-0.6B-q4f16_1-MLC",
    label: "Qwen3 0.6B",
    vocabTokens: 151936,
    quant: "q4f16",
    downloadMb: 335,
    vramMb: 1403,
    requiresShaderF16: false,
    tier: "quality",
    warning: null,
  },
  {
    id: "gemma3-1b-it-q4f16_1-MLC",
    label: "Gemma 3 1B",
    vocabTokens: 262144,
    quant: "q4f16",
    downloadMb: 563,
    vramMb: 711,
    requiresShaderF16: false,
    tier: "mid",
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
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    label: "SmolLM2 1.7B",
    vocabTokens: 49152,
    quant: "q4f16",
    downloadMb: 963,
    vramMb: 1774,
    requiresShaderF16: true,
    tier: "stress",
    warning: "Large download (~1 GB). Needs a comfortable VRAM budget.",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 3B",
    vocabTokens: 128256,
    quant: "q4f16",
    downloadMb: 1807,
    vramMb: 2264,
    requiresShaderF16: false,
    tier: "stress",
    warning: "Stress model (~1.8 GB download, ~2.3 GB VRAM). Desktop recommended.",
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

/** Compact option label for the dock select. */
export function formatModelOption(model) {
  return `${model.label} · ${model.downloadMb}MB · ~${model.vramMb}MB VRAM`;
}
