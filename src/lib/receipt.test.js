import { describe, expect, it } from "vitest";
import { validateReceipt } from "@shared/receiptSchema.js";
import { appendToken, createFlightRecord, finishRecord } from "./flightRecord.js";
import { buildReceipt, receiptRuntime } from "./receipt.js";

describe("receipt", () => {
  it("maps engine kinds onto the receipt runtime enum", () => {
    expect(receiptRuntime("webllm")).toBe("webgpu");
    expect(receiptRuntime("mock")).toBe("mock");
    expect(receiptRuntime("webgpu")).toBe("webgpu");
  });
  it("builds a schema-valid receipt from a run", () => {
    let record = createFlightRecord({
      runId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      modelId: "SmolLM2-360M-Instruct-q4f16_1-MLC",
      prompt: "ping",
      startedAt: 0,
    });
    record = appendToken(record, { text: "pong", at: 80 });
    record = appendToken(record, { text: "!", at: 120 });
    record = finishRecord(record, {
      prompt_tokens: 2,
      extra: {
        decode_tokens_per_s: 25,
        time_to_first_token_s: 0.08,
      },
    }, 120);

    const receipt = buildReceipt(record, {
      runtime: "mock",
      createdAt: "2026-08-14T12:00:00.000Z",
    });

    expect(validateReceipt(receipt).ok).toBe(true);
    expect(receipt.model_size_mb).toBe(204);
    expect(receipt.network_mode).toBe("local-only");
    expect(receipt.ttft_ms).toBe(80);
  });

  it("maps webllm engine kind to webgpu runtime", () => {
    let record = createFlightRecord({
      runId: "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
      modelId: "SmolLM2-360M-Instruct-q4f16_1-MLC",
      prompt: "ping",
      startedAt: 0,
    });
    record = appendToken(record, { text: "ok", at: 50 });
    record = finishRecord(record, {
      prompt_tokens: 1,
      extra: { decode_tokens_per_s: 20, time_to_first_token_s: 0.05 },
    }, 50);

    const receipt = buildReceipt(record, { runtime: "webllm" });
    expect(receipt.runtime).toBe("webgpu");
    expect(validateReceipt(receipt).ok).toBe(true);
  });
});
