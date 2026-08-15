import { describe, expect, it } from "vitest";
import { autoEdges, histogram, mean, percentile, roundTo, stddev } from "./telemetry.js";

describe("telemetry", () => {
  it("returns null for empty percentile", () => {
    expect(percentile([], 50)).toBeNull();
  });

  it("uses nearest-rank percentile", () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 95)).toBe(40);
    expect(percentile([7], 95)).toBe(7);
  });

  it("rejects ranks outside 0-100", () => {
    expect(() => percentile([1], 101)).toThrow();
  });

  it("rounds to fixed digits", () => {
    expect(roundTo(12.345, 1)).toBe(12.3);
    expect(roundTo(null, 1)).toBeNull();
  });

  it("computes mean, sample stddev, and histogram buckets", () => {
    expect(mean([10, 20, 30])).toBe(20);
    expect(stddev([10, 20, 30])).toBe(10);
    expect(histogram([5, 15, 40], [0, 10, 20, 80])).toEqual([
      { start: 0, end: 10, count: 1 },
      { start: 10, end: 20, count: 1 },
      { start: 20, end: 80, count: 1 },
    ]);
  });

  describe("autoEdges", () => {
    it("puts outliers in an open tail bin instead of stretching the axis", () => {
      const gaps = [...Array(40).fill(13), 900];
      const edges = autoEdges(gaps);
      expect(edges.at(-1)).toBe(Infinity);
      const buckets = histogram(gaps, edges);
      expect(buckets.at(-1).count).toBe(1);
      expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(gaps.length);
    });

    it("spreads a narrow range over several bins", () => {
      const gaps = Array.from({ length: 100 }, (unused, index) => 11 + (index % 8));
      const buckets = histogram(gaps, autoEdges(gaps));
      const used = buckets.filter((bucket) => bucket.count > 0);
      expect(used.length).toBeGreaterThan(3);
    });

    it("survives an empty run", () => {
      expect(autoEdges([])).toEqual([0, Infinity]);
    });
  });
});
