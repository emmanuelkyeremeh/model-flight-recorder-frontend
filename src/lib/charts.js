/* Canvas chart primitives for the run instrument.
   Geometry follows the observed conventions of Observable Plot and
   TradingView rather than library defaults: fixed plot margins so panels in
   a row align, horizontal gridlines only, fixed-decimal ticks, and
   percentile reference lines labelled inside the plot at the right edge. */

import { THEME, chartPalette } from "./theme.js";

export const PLOT = Object.freeze({
  top: 20,
  right: 12,
  bottom: 22,
  left: 34,
});

let palette = chartPalette(THEME.DARK);

/** Keep the canvas ink in step with the document theme. */
export function setChartTheme(theme) {
  palette = chartPalette(theme);
}

const TICK_FONT = "500 11px 'Geist Variable', Geist, ui-sans-serif, system-ui, sans-serif";
const NOTE_FONT = "11px 'Geist Variable', Geist, ui-sans-serif, system-ui, sans-serif";

/** Inner plot rectangle for a canvas of this size. */
export function plotBox(width, height) {
  return {
    x: PLOT.left,
    y: PLOT.top,
    width: Math.max(1, width - PLOT.left - PLOT.right),
    height: Math.max(1, height - PLOT.top - PLOT.bottom),
  };
}

/**
 * Column width for n bars across a plot, never thinner than a device pixel.
 * At 500 tokens this collapses to hairline columns with no gap, which is the
 * behaviour a dense strip wants.
 */
export function columnWidth(plotWidth, count) {
  if (count <= 0) {
    return 0;
  }
  const slot = plotWidth / count;
  return Math.max(1, Math.floor(slot) - (slot > 3 ? 1 : 0));
}

/**
 * Upper bound for a latency axis. Clamps to a little above p99 so one
 * pathological stall cannot flatten the whole series into the baseline.
 */
export function latencyCeiling(values, p99) {
  if (!values.length) {
    return 1;
  }
  const max = Math.max(...values);
  if (p99 == null || p99 <= 0) {
    return max;
  }
  return Math.min(max, Math.max(p99 * 1.35, p99 + 4));
}

function gridlines(ctx, box, ceiling, ticks = 3, format = (value) => String(Math.round(value))) {
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = palette.dim;
  ctx.font = TICK_FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let step = 0; step <= ticks; step += 1) {
    const value = (ceiling / ticks) * step;
    const y = Math.round(box.y + box.height - (value / ceiling) * box.height) + 0.5;
    ctx.beginPath();
    ctx.moveTo(box.x, y);
    ctx.lineTo(box.x + box.width, y);
    ctx.stroke();
    ctx.fillText(format(value), box.x - 6, y);
  }
}

/**
 * Names the axes in the strip reserved above the plot: the y unit at the left,
 * an optional x unit at the right. Stated once per chart so no tick has to carry
 * a unit and the numbers stay aligned on width alone.
 */
function axisUnits(ctx, box, yUnit, xUnit) {
  ctx.font = NOTE_FONT;
  ctx.fillStyle = palette.dim;
  ctx.textBaseline = "alphabetic";
  const y = box.y - 7;
  if (yUnit) {
    ctx.textAlign = "left";
    ctx.fillText(yUnit, box.x - PLOT.left + 2, y);
  }
  if (xUnit) {
    ctx.textAlign = "right";
    ctx.fillText(xUnit, box.x + box.width, y);
  }
}

function referenceLine(ctx, box, value, ceiling, { color, dash, label }) {
  if (value == null || value <= 0 || value > ceiling) {
    return;
  }
  const y = Math.round(box.y + box.height - (value / ceiling) * box.height) + 0.5;
  ctx.save();
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(box.x, y);
  ctx.lineTo(box.x + box.width, y);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.font = NOTE_FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, box.x + box.width - 2, y - 1);
}

function emptyNote(ctx, box, text) {
  ctx.fillStyle = palette.dim;
  ctx.font = NOTE_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * Inter-token latency per token, with p50/p95/p99 reference lines and a
 * crosshair on the selected token so the strip is linked to the stream.
 */
export function drawLatency(ctx, {
  width,
  height,
  delays = [],
  p50 = null,
  p95 = null,
  p99 = null,
  stallThreshold = null,
  selected = null,
  live = false,
}) {
  const box = plotBox(width, height);
  ctx.clearRect(0, 0, width, height);

  if (!delays.length) {
    emptyNote(ctx, box, live ? "waiting on first token" : "no run recorded");
    return;
  }

  const ceiling = latencyCeiling(delays, p99);
  gridlines(ctx, box, ceiling);
  axisUnits(ctx, box, "gap (ms)", "token index");

  const bar = columnWidth(box.width, delays.length);
  const slot = box.width / delays.length;

  delays.forEach((value, index) => {
    const clipped = Math.min(value, ceiling);
    const barHeight = Math.max(1, (clipped / ceiling) * box.height);
    const x = Math.round(box.x + index * slot);
    const y = Math.round(box.y + box.height - barHeight);
    const stalled = stallThreshold != null && value > stallThreshold;
    ctx.fillStyle = stalled ? palette.stall : palette.seriesDeep;
    ctx.fillRect(x, y, bar, barHeight);
    if (value > ceiling) {
      /* Clipped bars get a cap so a truncated stall still reads as off-scale. */
      ctx.fillStyle = palette.stall;
      ctx.fillRect(x, box.y, bar, 2);
    }
  });

  referenceLine(ctx, box, p50, ceiling, { color: palette.refSoft, dash: [2, 2], label: "p50" });
  referenceLine(ctx, box, p95, ceiling, { color: palette.tie, dash: [4, 3], label: "p95" });
  referenceLine(ctx, box, p99, ceiling, { color: palette.stall, dash: [4, 3], label: "p99" });

  if (selected != null && selected >= 0 && selected < delays.length) {
    const x = Math.round(box.x + selected * slot + bar / 2) + 0.5;
    ctx.strokeStyle = palette.crosshair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, box.y);
    ctx.lineTo(x, box.y + box.height);
    ctx.stroke();
  }

  ctx.fillStyle = palette.dim;
  ctx.font = TICK_FONT;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("0", box.x, box.y + box.height + 5);
  ctx.textAlign = "right";
  ctx.fillText(String(delays.length), box.x + box.width, box.y + box.height + 5);
  ctx.textAlign = "center";
  ctx.fillText("token", box.x + box.width / 2, box.y + box.height + 5);
}

/** Distribution of inter-token gaps over fixed millisecond bins. */
export function drawHistogram(ctx, { width, height, buckets = [] }) {
  const box = plotBox(width, height);
  ctx.clearRect(0, 0, width, height);

  const counts = buckets.map((bucket) => bucket.count);
  const peak = counts.length ? Math.max(...counts) : 0;
  if (!peak) {
    emptyNote(ctx, box, "no gaps recorded");
    return;
  }

  gridlines(ctx, box, peak, 2);
  axisUnits(ctx, box, "tokens", "gap (ms)");

  const slot = box.width / buckets.length;
  /* Labelling every edge crowds a 300px panel, so tick roughly five of them. */
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 5));

  buckets.forEach((bucket, index) => {
    const barHeight = Math.max(bucket.count > 0 ? 1 : 0, (bucket.count / peak) * box.height);
    const x = Math.round(box.x + index * slot);
    const w = Math.max(1, Math.floor(slot) - 2);
    const isTail = !Number.isFinite(bucket.end);
    ctx.fillStyle = isTail ? palette.stall : palette.seriesDeep;
    ctx.fillRect(x, Math.round(box.y + box.height - barHeight), w, barHeight);

    if (index % labelEvery !== 0 && !isTail) {
      return;
    }
    ctx.fillStyle = isTail ? palette.stall : palette.dim;
    ctx.font = TICK_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(isTail ? "tail" : String(Math.round(bucket.start)), x + w / 2, box.y + box.height + 5);
  });
}

/**
 * Probability the model put on each token it chose, with the runner-up drawn
 * behind it. Where the two nearly touch, the decision was a coin-flip.
 */
export function drawConfidence(ctx, { width, height, frames = [], selected = null }) {
  const box = plotBox(width, height);
  ctx.clearRect(0, 0, width, height);

  const scored = frames.filter((frame) => frame.prob != null);
  if (!scored.length) {
    emptyNote(ctx, box, "no logprobs on this run");
    return;
  }

  /* Probability axis: 0.0–1.0, so the ticks are decimals, not rounded integers. */
  gridlines(ctx, box, 1, 2, (value) => value.toFixed(1));
  axisUnits(ctx, box, "probability", "token index");

  const slot = box.width / frames.length;
  const bar = columnWidth(box.width, frames.length);

  frames.forEach((frame, index) => {
    if (frame.prob == null) {
      return;
    }
    const x = Math.round(box.x + index * slot);
    const chosen = Math.max(1, frame.prob * box.height);
    const second = frame.runnerUp ? Math.exp(frame.runnerUp.logprob) * box.height : 0;

    if (second > 0) {
      ctx.fillStyle = palette.runnerUp;
      ctx.fillRect(x, Math.round(box.y + box.height - second), bar, Math.max(1, second));
    }
    ctx.fillStyle = frame.band === "guess" ? palette.stall : palette.series;
    ctx.fillRect(x, Math.round(box.y + box.height - chosen), bar, chosen);
  });

  if (selected != null && selected >= 0 && selected < frames.length) {
    const x = Math.round(box.x + selected * slot + bar / 2) + 0.5;
    ctx.strokeStyle = palette.crosshair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, box.y);
    ctx.lineTo(x, box.y + box.height);
    ctx.stroke();
  }

  ctx.fillStyle = palette.tie;
  ctx.font = NOTE_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("runner-up", box.x + 2, box.y + 1);
  ctx.fillStyle = palette.dim;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("token", box.x + box.width / 2, box.y + box.height + 5);
}

/**
 * The logprob gap between the sampled token and the strongest alternative.
 * Positive bars mean the sampled token led; negative bars reveal sampling
 * moments where another candidate was actually more likely.
 */
export function drawDecisionMargin(ctx, { width, height, frames = [], selected = null }) {
  const box = plotBox(width, height);
  ctx.clearRect(0, 0, width, height);

  const margins = frames
    .map((frame) => frame.margin)
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!margins.length) {
    emptyNote(ctx, box, "no alternative margins recorded");
    return;
  }

  const ceiling = Math.max(0.25, ...margins.map((value) => Math.abs(value)));
  const middle = Math.round(box.y + box.height / 2) + 0.5;
  const reach = box.height * 0.46;
  const slot = box.width / frames.length;
  const bar = columnWidth(box.width, frames.length);

  axisUnits(ctx, box, "logprob", "token index");

  ctx.strokeStyle = palette.grid;
  ctx.beginPath();
  ctx.moveTo(box.x, middle);
  ctx.lineTo(box.x + box.width, middle);
  ctx.stroke();

  /* The magnitude axis is symmetric and clipped to ±ceiling; label both ends and
     the zero line so a bar height reads as an actual logprob difference. */
  ctx.fillStyle = palette.dim;
  ctx.font = TICK_FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(`+${ceiling.toFixed(1)}`, box.x - 6, middle - reach);
  ctx.fillText("0", box.x - 6, middle);
  ctx.fillText(`\u2212${ceiling.toFixed(1)}`, box.x - 6, middle + reach);

  frames.forEach((frame, index) => {
    if (frame.margin == null) {
      return;
    }
    const x = Math.round(box.x + index * slot);
    const magnitude = Math.max(1, (Math.min(Math.abs(frame.margin), ceiling) / ceiling) * box.height * 0.46);
    ctx.fillStyle = frame.margin >= 0 ? palette.series : palette.commit;
    ctx.fillRect(x, frame.margin >= 0 ? middle - magnitude : middle, bar, magnitude);
  });

  if (selected != null && selected >= 0 && selected < frames.length) {
    const x = Math.round(box.x + selected * slot + bar / 2) + 0.5;
    ctx.strokeStyle = palette.crosshair;
    ctx.beginPath();
    ctx.moveTo(x, box.y);
    ctx.lineTo(x, box.y + box.height);
    ctx.stroke();
  }

  ctx.font = NOTE_FONT;
  ctx.fillStyle = palette.dim;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("sampled token led", box.x + 2, box.y + 1);
  ctx.textBaseline = "bottom";
  ctx.fillText("alternative led", box.x + 2, box.y + box.height - 1);
}

/**
 * A direct test of a tempting claim: did lower confidence make generation
 * slower? Each point is one decoded token; the plot shows the relationship
 * without implying causation.
 */
export function drawLatencyConfidence(ctx, {
  width,
  height,
  frames = [],
  p99 = null,
  stallThreshold = null,
  selected = null,
}) {
  const box = plotBox(width, height);
  ctx.clearRect(0, 0, width, height);

  const scored = frames.filter((frame) => !frame.isPrefill && frame.prob != null);
  if (!scored.length) {
    emptyNote(ctx, box, "no scored decode tokens");
    return;
  }

  const ceiling = latencyCeiling(scored.map((frame) => frame.delayMs), p99);
  gridlines(ctx, box, ceiling);
  axisUnits(ctx, box, "gap (ms)", "confidence (%)");

  for (const frame of scored) {
    const x = box.x + frame.prob * box.width;
    const y = box.y + box.height - (Math.min(frame.delayMs, ceiling) / ceiling) * box.height;
    const stalled = stallThreshold != null && frame.delayMs > stallThreshold;
    ctx.fillStyle = frame.index === selected ? palette.commit : stalled ? palette.stall : palette.series;
    ctx.beginPath();
    ctx.arc(x, y, frame.index === selected ? 3.5 : 2.25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = palette.dim;
  ctx.font = TICK_FONT;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("0% confidence", box.x, box.y + box.height + 5);
  ctx.textAlign = "right";
  ctx.fillText("100%", box.x + box.width, box.y + box.height + 5);
}

/** Ink used by the surrounding CSS, exported so both stay in step. */
export function chartInk() {
  return palette;
}
