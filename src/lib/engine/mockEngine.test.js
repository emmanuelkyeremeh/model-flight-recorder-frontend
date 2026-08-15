import { describe, expect, it } from "vitest";
import { createManualClock, createMockEngine } from "./mockEngine.js";

describe("mockEngine", () => {
  it("does not load until load() is called", async () => {
    const engine = createMockEngine({ clock: createManualClock() });
    await expect(engine.generate({ messages: [], onToken: () => {} })).rejects.toThrow(/not armed/);
  });

  it("emits progress then tokens with stable ITL", async () => {
    const clock = createManualClock();
    const engine = createMockEngine({
      clock,
      tokens: ["a", "b", "c"],
      ttftMs: 100,
      itlMs: 20,
    });
    const progress = [];
    await engine.load("demo-model", (report) => progress.push(report.progress));
    expect(progress.at(-1)).toBe(1);

    const tokens = [];
    await engine.generate({
      messages: [{ role: "user", content: "hi" }],
      onToken: (event) => tokens.push(event),
      onUsage: () => {},
    });

    expect(tokens.map((token) => token.text)).toEqual(["a", "b", "c"]);
    expect(tokens[1].at - tokens[0].at).toBe(20);
    expect(tokens[2].at - tokens[1].at).toBe(20);
  });
});
