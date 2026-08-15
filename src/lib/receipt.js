import {
  APP_NAME,
  NETWORK_MODE_LOCAL,
  RECEIPT_SCHEMA_VERSION,
  validateReceipt,
} from "@shared/receiptSchema.js";
import { getModelById } from "./catalog.js";
import { summarizeRecord } from "./flightRecord.js";

export function receiptRuntime(engineKind) {
  if (engineKind === "mock") {
    return "mock";
  }
  return "webgpu";
}

export function buildReceipt(record, extras = {}) {
  const model = getModelById(record.modelId);
  const summary = summarizeRecord(record);

  const receipt = {
    schema_version: RECEIPT_SCHEMA_VERSION,
    app: APP_NAME,
    run_id: record.runId,
    model_id: record.modelId,
    model_size_mb: model.downloadMb,
    runtime: receiptRuntime(extras.runtime),
    ttft_ms: summary.ttftMs,
    itl_ms_p50: summary.itlMsP50,
    itl_ms_p95: summary.itlMsP95,
    tokens_out: summary.tokensOut,
    tok_per_s: summary.tokPerS,
    prompt_tokens: summary.promptTokens ?? 0,
    wall_ms: summary.wallMs ?? 0,
    browser: extras.browser ?? null,
    gpu_renderer: extras.gpuRenderer ?? null,
    network_mode: NETWORK_MODE_LOCAL,
    app_version: extras.appVersion ?? "0.1.0",
    created_at: extras.createdAt ?? new Date().toISOString(),
  };

  const result = validateReceipt(receipt);
  if (!result.ok) {
    throw new Error(`Invalid receipt: ${result.errors.join("; ")}`);
  }

  return result.receipt;
}

export function receiptToJson(receipt) {
  return `${JSON.stringify(receipt, null, 2)}\n`;
}
