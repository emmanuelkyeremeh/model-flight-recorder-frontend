import { interTokenLatenciesMs, summarizeRecord } from "./flightRecord.js";
import { autoEdges, histogram, mean, percentile, roundTo, stddev } from "./telemetry.js";

const STALL_MULTIPLIER = 2.5;
const COIN_FLIP_MARGIN = 0.35;
const GUESS_PROB = 0.15;
const LOCKED_PROB = 0.7;

export function logprobToProb(logprob) {
  if (typeof logprob !== "number" || !Number.isFinite(logprob)) {
    return null;
  }
  return Math.exp(logprob);
}

export function confidenceBand(prob) {
  if (prob === null || prob === undefined) {
    return "unknown";
  }
  if (prob >= LOCKED_PROB) {
    return "locked";
  }
  if (prob >= 0.4) {
    return "steady";
  }
  if (prob >= GUESS_PROB) {
    return "split";
  }
  return "guess";
}

function runnerUp(token) {
  const alts = token.alternatives ?? [];
  const others = alts
    .filter((entry) => entry.token !== token.text)
    .sort((left, right) => right.logprob - left.logprob);
  return others[0] ?? null;
}

export function analyzeFlight(record) {
  const summary = summarizeRecord(record);
  const itl = interTokenLatenciesMs(record);
  const frames = record.tokens.map((token, index) => {
    const previousAt = index === 0 ? record.startedAt : record.tokens[index - 1].at;
    const delayMs = token.at - previousAt;
    const prob = logprobToProb(token.logprob);
    const second = runnerUp(token);
    const margin = token.logprob != null && second
      ? token.logprob - second.logprob
      : null;
    return {
      index,
      text: token.text,
      logprob: token.logprob,
      prob,
      band: confidenceBand(prob),
      delayMs,
      isPrefill: index === 0,
      alternatives: token.alternatives ?? [],
      runnerUp: second,
      margin,
    };
  });

  const decodeDelays = frames.filter((frame) => !frame.isPrefill).map((frame) => frame.delayMs);
  const probs = frames.map((frame) => frame.prob).filter((value) => value !== null);
  const logprobs = frames.map((frame) => frame.logprob).filter((value) => typeof value === "number");
  const meanLogprob = mean(logprobs);
  const p50 = summary.itlMsP50;
  const p95 = summary.itlMsP95;
  const p99 = roundTo(percentile(itl, 99), 1);
  const meanItl = roundTo(mean(itl), 1);
  const itlStd = roundTo(stddev(itl), 1);
  const jitterCv = meanItl && itlStd !== null ? roundTo(itlStd / meanItl, 2) : null;
  const tailRatio = p50 && p95 ? roundTo(p95 / p50, 2) : null;
  const prefillMs = summary.ttftMs;
  const decodeMs = summary.wallMs != null && prefillMs != null
    ? roundTo(Math.max(0, summary.wallMs - prefillMs), 1)
    : null;

  const stalls = frames.filter((frame) => (
    !frame.isPrefill && p50 != null && frame.delayMs > STALL_MULTIPLIER * p50
  ));
  const coinFlips = frames.filter((frame) => (
    frame.margin != null && Math.abs(frame.margin) < COIN_FLIP_MARGIN
  ));
  const guesses = frames.filter((frame) => frame.prob != null && frame.prob < GUESS_PROB);
  const hardest = [...frames]
    .filter((frame) => frame.prob !== null)
    .sort((left, right) => left.prob - right.prob)[0] ?? null;

  return {
    ...summary,
    frames,
    decodeDelays,
    itlMsP99: p99,
    itlMsMean: meanItl,
    itlStd,
    jitterCv,
    tailRatio,
    prefillMs,
    decodeMs,
    meanProb: roundTo(mean(probs), 3),
    perplexity: meanLogprob == null ? null : roundTo(Math.exp(-meanLogprob), 2),
    histogram: histogram(itl, autoEdges(itl)),
    stalls,
    coinFlips,
    guesses,
    hardest,
    promptTokens: summary.promptTokens ?? 0,
    completionTokens: summary.tokensOut,
  };
}
