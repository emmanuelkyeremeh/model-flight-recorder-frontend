/**
 * Nearest-rank percentile. Empty input returns null.
 * @param {number[]} values
 * @param {number} percentileRank 0–100
 */
export function percentile(values, percentileRank) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  if (percentileRank < 0 || percentileRank > 100) {
    throw new Error("percentileRank must be between 0 and 100.");
  }

  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.ceil((percentileRank / 100) * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index];
}

export function roundTo(value, digits) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function median(values) {
  return percentile(values, 50);
}

export function mean(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stddev(values) {
  if (!Array.isArray(values) || values.length < 2) {
    return null;
  }
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Bin edges chosen from the data rather than fixed, so a run whose gaps all sit
 * between 11 and 18ms still shows a shape instead of one tall bar. Bin count
 * follows the square-root rule; the top edge is open so stalls land in a
 * visible tail bin instead of stretching the axis.
 */
const NICE_STEPS_MS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 250, 500, 1000];

export function autoEdges(values, maxBins = 14) {
  if (!Array.isArray(values) || values.length === 0) {
    return [0, Infinity];
  }
  const low = Math.floor(Math.min(...values));
  const high = Math.max(low + 1, Math.ceil(percentile(values, 95)));
  const span = high - low;
  /* Snap to a round step. Dividing the span evenly instead produces
     sub-millisecond bins on a steady run, which bins noise and prints two
     ticks with the same rounded label. */
  const step = NICE_STEPS_MS.find((candidate) => span / candidate <= maxBins)
    ?? Math.ceil(span / maxBins);

  const edges = [];
  for (let edge = low; edge < high - 1e-9; edge += step) {
    edges.push(roundTo(edge, 3));
  }
  if (edges.at(-1) !== high) {
    edges.push(high);
  }
  edges.push(Infinity);
  return edges;
}

export function histogram(values, edges) {
  const counts = new Array(edges.length - 1).fill(0);
  for (const value of values) {
    let bucket = counts.length - 1;
    for (let index = 0; index < edges.length - 1; index += 1) {
      if (value < edges[index + 1]) {
        bucket = index;
        break;
      }
    }
    counts[bucket] += 1;
  }
  return counts.map((count, index) => ({
    start: edges[index],
    end: edges[index + 1],
    count,
  }));
}
