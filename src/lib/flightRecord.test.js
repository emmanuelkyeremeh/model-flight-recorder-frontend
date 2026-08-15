import { describe, expect, it } from "vitest";
import { appendToken, createFlightRecord, finishRecord, interTokenLatenciesMs, summarizeRecord } from "./flightRecord.js";

function recordWithTokens(times) {
  let record = createFlightRecord({
    runId: "run-1",
    modelId: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    prompt: "hello",
    startedAt: 1000,
  });
  times.forEach((at, index) => {
    record = appendToken(record, { text: `t${index}`, at });
  });
  return finishRecord(record, {
    prompt_tokens: 4,
    extra: {
      decode_tokens_per_s: 25,
      time_to_first_token_s: 0.12,
    },
  }, 1480);
}

describe("flightRecord", () => {
  it("requires ids", () => {
    expect(() => createFlightRecord({ runId: "", modelId: "x", startedAt: 0 })).toThrow();
  });

  it("marks TTFT on the first token", () => {
    const record = recordWithTokens([1120, 1160, 1200]);
    expect(record.firstTokenAt).toBe(1120);
    expect(interTokenLatenciesMs(record)).toEqual([40, 40]);
  });

  it("prefers engine usage for TTFT and tok/s", () => {
    const summary = summarizeRecord(recordWithTokens([1120, 1160, 1200]));
    expect(summary.ttftMs).toBe(120);
    expect(summary.tokPerS).toBe(25);
    expect(summary.itlMsP50).toBe(40);
    expect(summary.promptTokens).toBe(4);
  });
});
