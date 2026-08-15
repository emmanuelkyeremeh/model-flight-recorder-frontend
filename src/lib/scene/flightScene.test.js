import { describe, expect, it } from "vitest";
import { createSceneClock } from "./flightScene.js";

/** A hand-cranked stand-in for performance.now(), in milliseconds. */
function stopwatch(start = 0) {
  let value = start;
  return {
    now: () => value,
    advance(ms) {
      value += ms;
    },
  };
}

describe("createSceneClock", () => {
  it("reports the seconds between ticks and the total spent rendering", () => {
    const watch = stopwatch(1000);
    const clock = createSceneClock(watch.now);

    watch.advance(16);
    const first = clock.tick();
    watch.advance(16);
    const second = clock.tick();

    expect(first.delta).toBeCloseTo(0.016, 5);
    expect(second.delta).toBeCloseTo(0.016, 5);
    expect(second.elapsed).toBeCloseTo(0.032, 5);
  });

  it("clamps a long stall so drift and camera cannot teleport", () => {
    const watch = stopwatch();
    const clock = createSceneClock(watch.now);

    watch.advance(4000);
    const { delta, elapsed } = clock.tick(0.05);

    expect(delta).toBe(0.05);
    expect(elapsed).toBe(0.05);
  });

  it("discards the gap accumulated while the loop was parked", () => {
    const watch = stopwatch();
    const clock = createSceneClock(watch.now);

    watch.advance(30_000);
    clock.resume();
    watch.advance(16);
    const { delta } = clock.tick();

    expect(delta).toBeCloseTo(0.016, 5);
  });
});
