export const RECEIPT_SCHEMA_VERSION = 1;
export const APP_NAME = "ModelFlightRecorder";
export const NETWORK_MODE_LOCAL = "local-only";

export const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  "schema_version",
  "app",
  "run_id",
  "model_id",
  "model_size_mb",
  "runtime",
  "ttft_ms",
  "itl_ms_p50",
  "itl_ms_p95",
  "tokens_out",
  "tok_per_s",
  "prompt_tokens",
  "wall_ms",
  "network_mode",
  "created_at",
]);

const MAX_RUN_ID_LENGTH = 80;
const MAX_MODEL_ID_LENGTH = 200;
const MAX_RECEIPT_BYTES = 64 * 1024;

/**
 * @param {unknown} value
 * @returns {{ ok: true, receipt: object } | { ok: false, errors: string[] }}
 */
export function validateReceipt(value) {
  const errors = [];

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["Receipt must be an object."] };
  }

  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_RECEIPT_BYTES) {
    return { ok: false, errors: ["Receipt exceeds 64KB."] };
  }

  const receipt = value;

  for (const field of REQUIRED_RECEIPT_FIELDS) {
    if (!(field in receipt) || receipt[field] === undefined) {
      errors.push(`Missing field: ${field}`);
    }
  }

  if (receipt.schema_version !== RECEIPT_SCHEMA_VERSION) {
    errors.push(`schema_version must be ${RECEIPT_SCHEMA_VERSION}`);
  }

  if (receipt.app !== APP_NAME) {
    errors.push(`app must be ${APP_NAME}`);
  }

  if (typeof receipt.run_id !== "string" || receipt.run_id.length === 0 || receipt.run_id.length > MAX_RUN_ID_LENGTH) {
    errors.push("run_id must be a non-empty string.");
  }

  if (typeof receipt.model_id !== "string" || receipt.model_id.length === 0 || receipt.model_id.length > MAX_MODEL_ID_LENGTH) {
    errors.push("model_id must be a non-empty string.");
  }

  assertFiniteNumber(errors, "model_size_mb", receipt.model_size_mb, 0);
  assertFiniteNumber(errors, "tokens_out", receipt.tokens_out, 0);
  assertFiniteNumber(errors, "prompt_tokens", receipt.prompt_tokens, 0);
  assertFiniteNumber(errors, "wall_ms", receipt.wall_ms, 0);

  if (receipt.ttft_ms !== null) {
    assertFiniteNumber(errors, "ttft_ms", receipt.ttft_ms, 0);
  }

  if (receipt.itl_ms_p50 !== null) {
    assertFiniteNumber(errors, "itl_ms_p50", receipt.itl_ms_p50, 0);
  }

  if (receipt.itl_ms_p95 !== null) {
    assertFiniteNumber(errors, "itl_ms_p95", receipt.itl_ms_p95, 0);
  }

  if (receipt.tok_per_s !== null) {
    assertFiniteNumber(errors, "tok_per_s", receipt.tok_per_s, 0);
  }

  if (receipt.runtime !== "webgpu" && receipt.runtime !== "mock") {
    errors.push("runtime must be webgpu or mock.");
  }

  if (receipt.network_mode !== NETWORK_MODE_LOCAL) {
    errors.push(`network_mode must be ${NETWORK_MODE_LOCAL}`);
  }

  if (typeof receipt.created_at !== "string" || Number.isNaN(Date.parse(receipt.created_at))) {
    errors.push("created_at must be an ISO timestamp.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, receipt };
}

function assertFiniteNumber(errors, field, value, min) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    errors.push(`${field} must be a finite number >= ${min}.`);
  }
}
