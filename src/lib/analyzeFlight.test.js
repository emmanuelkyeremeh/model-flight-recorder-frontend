import { describe, expect, it } from "vitest";
import { analyzeFlight, confidenceBand, logprobToProb } from "./analyzeFlight.js";
import { appendToken, createFlightRecord, finishRecord } from "./flightRecord.js";

function flight() {
  let record = createFlightRecord({
    runId: "run-1",
    modelId: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    prompt: "hi",
    startedAt: 0,
  });
  record = appendToken(record, {
    text: "Hello",
    at: 80,
    logprob: -0.05,
    alternatives: [
      { token: "Hello", logprob: -0.05 },
      { token: "Hi", logprob: -3.2 },
    ],
  });
  record = appendToken(record, {
    text: " there",
    at: 120,
    logprob: -0.9,
    alternatives: [
      { token: " there", logprob: -0.9 },
      { token: " world", logprob: -1.05 },
    ],
  });
  record = appendToken(record, {
    text: "?",
    at: 280,
    logprob: -2.4,
    alternatives: [
      { token: "?", logprob: -2.4 },
      { token: ".", logprob: -0.8 },
    ],
  });
  return finishRecord(record, { prompt_tokens: 2 }, 280);
}

describe("analyzeFlight", () => {
  it("converts logprob to probability", () => {
    expect(logprobToProb(0)).toBe(1);
    expect(logprobToProb(-Math.log(2))).toBeCloseTo(0.5, 5);
    expect(confidenceBand(0.9)).toBe("locked");
    expect(confidenceBand(0.08)).toBe("guess");
  });

  it("flags stalls, coin-flips, and low-confidence tokens", () => {
    const analysis = analyzeFlight(flight());
    expect(analysis.ttftMs).toBe(80);
    expect(analysis.itlMsP50).toBe(40);
    expect(analysis.stalls).toHaveLength(1);
    expect(analysis.stalls[0].text).toBe("?");
    expect(analysis.coinFlips.some((frame) => frame.text === " there")).toBe(true);
    expect(analysis.guesses[0].text).toBe("?");
    expect(analysis.hardest.text).toBe("?");
    expect(analysis.histogram.some((bucket) => bucket.count > 0)).toBe(true);
    expect(analysis.perplexity).toBeGreaterThan(1);
  });
});
