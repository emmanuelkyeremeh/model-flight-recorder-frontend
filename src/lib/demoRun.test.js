import { describe, expect, it } from "vitest";
import { analyzeFlight } from "./analyzeFlight.js";
import { createDemoRecord } from "./demoRun.js";

describe("demo run", () => {
  it("is deterministic", () => {
    const first = createDemoRecord();
    const second = createDemoRecord();
    expect(second.tokens.map((token) => token.at)).toEqual(first.tokens.map((token) => token.at));
    expect(second.tokens.map((token) => token.logprob)).toEqual(first.tokens.map((token) => token.logprob));
  });

  it("carries enough tokens to fill the instrument", () => {
    const analysis = analyzeFlight(createDemoRecord());
    expect(analysis.frames.length).toBeGreaterThanOrEqual(90);
  });

  it("plants every finding the panels claim to show", () => {
    const analysis = analyzeFlight(createDemoRecord());
    expect(analysis.stalls.length).toBeGreaterThan(0);
    expect(analysis.coinFlips.length).toBeGreaterThan(0);
    expect(analysis.guesses.length).toBeGreaterThan(0);
    expect(analysis.hardest).not.toBeNull();
  });

  it("reads like plausible telemetry rather than round numbers", () => {
    const analysis = analyzeFlight(createDemoRecord());
    expect(analysis.ttftMs).toBeGreaterThan(100);
    expect(analysis.ttftMs).toBeLessThan(400);
    expect(analysis.itlMsP50).toBeGreaterThan(5);
    expect(analysis.itlMsP50).toBeLessThan(40);
    expect(analysis.tokPerS).toBeGreaterThan(20);
    expect(analysis.perplexity).toBeGreaterThan(1);
    expect(analysis.tailRatio).toBeGreaterThan(1);
  });

  it("spans every confidence band so the encoding is legible", () => {
    const analysis = analyzeFlight(createDemoRecord());
    const bands = new Set(analysis.frames.map((frame) => frame.band));
    expect(bands.has("locked")).toBe(true);
    expect(bands.has("steady")).toBe(true);
    expect(bands.has("guess")).toBe(true);
  });
});
