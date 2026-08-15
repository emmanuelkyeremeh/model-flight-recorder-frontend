import { describe, expect, it } from "vitest";
import { analyzeFlight } from "./analyzeFlight.js";
import { createDemoRecord } from "./demoRun.js";
import { buildCorridor, corridorEvents, readableToken } from "./corridor.js";

function fixture() {
  const analysis = analyzeFlight(createDemoRecord());
  return { analysis, corridor: buildCorridor(analysis.frames, { cadenceMs: analysis.itlMsP50 }) };
}

describe("buildCorridor", () => {
  it("gives every recorded token exactly one waypoint", () => {
    const { analysis, corridor } = fixture();

    expect(corridor.waypoints).toHaveLength(analysis.frames.length);
    expect(corridor.waypoints.map((point) => point.frameIndex))
      .toEqual(analysis.frames.map((frame) => frame.index));
  });

  it("always flies forward, never backward", () => {
    const { corridor } = fixture();

    for (let i = 1; i < corridor.waypoints.length; i += 1) {
      expect(corridor.waypoints[i].position.z).toBeLessThan(corridor.waypoints[i - 1].position.z);
    }
    expect(corridor.length).toBeGreaterThan(0);
  });

  it("spends more distance on a slower token", () => {
    const slow = buildCorridor(
      [{ index: 0, text: "a", prob: 0.9, delayMs: 400, alternatives: [] }],
      { cadenceMs: 20 },
    );
    const quick = buildCorridor(
      [{ index: 0, text: "a", prob: 0.9, delayMs: 8, alternatives: [] }],
      { cadenceMs: 20 },
    );

    expect(slow.length).toBeGreaterThan(quick.length);
  });

  it("flies the route higher when the model was more confident", () => {
    const [sure] = buildCorridor(
      [{ index: 0, text: "a", prob: 0.97, delayMs: 20, alternatives: [] }],
    ).waypoints;
    const [unsure] = buildCorridor(
      [{ index: 0, text: "a", prob: 0.04, delayMs: 20, alternatives: [] }],
    ).waypoints;
    const [unscored] = buildCorridor(
      [{ index: 0, text: "a", prob: null, delayMs: 20, alternatives: [] }],
    ).waypoints;

    expect(sure.position.y).toBeGreaterThan(0);
    expect(unsure.position.y).toBeLessThan(0);
    expect(unscored.position.y).toBe(0);
  });

  it("keeps every axis meaningful by holding the route straight in plan", () => {
    const { corridor } = fixture();

    /* A decorative sideways wander would invite the viewer to read it. */
    expect(corridor.waypoints.every((point) => point.position.x === 0)).toBe(true);
  });

  it("opens a wider halo when the model was less sure", () => {
    const [unsure] = buildCorridor(
      [{ index: 0, text: "a", prob: 0.05, delayMs: 20, alternatives: [] }],
    ).waypoints;
    const [certain] = buildCorridor(
      [{ index: 0, text: "a", prob: 0.98, delayMs: 20, alternatives: [] }],
    ).waypoints;

    expect(unsure.halo).toBeGreaterThan(certain.halo);
  });

  it("places losing candidates around the waypoint they lost at", () => {
    const { corridor } = fixture();
    const target = corridor.waypoints[12];
    const ring = corridor.alternates.filter((alt) => alt.frameIndex === target.frameIndex);

    expect(ring.length).toBeGreaterThan(0);
    for (const alternate of ring) {
      expect(alternate.position.z).toBe(target.position.z);
      expect(alternate.token).not.toBe(target.token);
    }
  });

  it("is deterministic", () => {
    const first = fixture().corridor;
    const second = fixture().corridor;

    expect(second.waypoints[9].position).toEqual(first.waypoints[9].position);
    expect(second.length).toBe(first.length);
  });
});

describe("corridorEvents", () => {
  it("tells the run as an ordered story anchored to real waypoints", () => {
    const { analysis, corridor } = fixture();
    const events = corridorEvents(analysis, corridor);

    expect(events.map((event) => event.kind)).toEqual(["hold", "stall", "tie", "guess"]);
    for (const event of events) {
      expect(event.waypoint.frameIndex).toBe(event.index);
      expect(event.detail.length).toBeGreaterThan(0);
    }
  });

  it("returns nothing when there is no run", () => {
    expect(corridorEvents(null, { waypoints: [] })).toEqual([]);
  });
});

describe("readableToken", () => {
  it("makes whitespace visible", () => {
    expect(readableToken("\n")).toBe("\\n");
    expect(readableToken(" ")).toBe("␣");
    expect(readableToken(" the")).toBe("the");
  });
});
