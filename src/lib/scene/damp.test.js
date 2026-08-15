import { describe, expect, it } from "vitest";
import { damp } from "./damp.js";

function runAt(fps, seconds) {
  let value = 0;
  const delta = 1 / fps;
  for (let frame = 0; frame < fps * seconds; frame += 1) {
    value = damp(value, 1, 5, delta);
  }
  return value;
}

describe("damp", () => {
  it("reaches the same position at different refresh rates", () => {
    expect(runAt(60, 1)).toBeCloseTo(runAt(144, 1), 10);
  });

  it("converges without overshooting", () => {
    const value = damp(0, 1, 5, 1 / 60);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1);
  });
});
