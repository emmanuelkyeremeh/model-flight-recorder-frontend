/**
 * The corridor is the spatial model behind the 3D scene: one route through the
 * space of everything the model could have said.
 *
 * The mapping is fixed and honest, and the legend in the UI states it:
 *   forward distance  = elapsed time, so a stall is literally a long dark gap
 *   altitude          = probability of the sampled token. The route is an
 *                       altimeter trace: it cruises where the model was sure
 *                       and sinks toward the deck where it was guessing.
 *   ring radius       = how far behind the winner an alternative finished
 *   halo radius       = how unsure the model was at that step
 *
 * There is deliberately no decorative axis. An earlier version wandered the
 * route sideways to make it look like a route, but a spatial axis that encodes
 * nothing invites the viewer to read something out of it, which is worse than
 * a straight line.
 *
 * Nothing here invents probabilities. Every number traces back to a logprob
 * WebLLM reported, or to a timestamp we measured.
 */

const FORWARD_MIN = 1.6;
const FORWARD_MAX = 9;
const ALTITUDE_SPAN = 8;
const RING_MIN = 0.55;
const RING_MAX = 2.9;
const HALO_MIN = 0.35;
const HALO_MAX = 3.2;

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function toProbability(logprob) {
  return typeof logprob === "number" && Number.isFinite(logprob) ? Math.exp(logprob) : null;
}

/** Confidence as height. Dead centre means the model reported nothing. */
function altitude(prob) {
  return ((prob == null ? 0.5 : clamp(prob, 0, 1)) - 0.5) * ALTITUDE_SPAN;
}

export function readableToken(text) {
  if (text === "\n") {
    return "\\n";
  }
  if (text === "\t") {
    return "\\t";
  }
  if (typeof text !== "string" || text.trim() === "") {
    return "␣";
  }
  return text.trim();
}

/**
 * Distance flown before a token. Logarithmic, because a 900 ms stall next to a
 * 12 ms token would otherwise put the rest of the run over the horizon.
 */
function forwardStep(delayMs, cadenceMs) {
  const ratio = Math.max(0, delayMs) / Math.max(1, cadenceMs);
  return clamp(FORWARD_MIN + Math.log1p(ratio) * 2.6, FORWARD_MIN, FORWARD_MAX);
}

/**
 * Candidates for one step, chosen first, then the runners-up the model reported.
 * WebLLM only returns a top-k, so this is everything we actually observed —
 * never a guess at the rest of the distribution.
 */
function candidatesFor(frame) {
  const seen = new Map();
  seen.set(frame.text, { token: frame.text, prob: frame.prob, chosen: true });

  for (const entry of frame.alternatives ?? []) {
    if (seen.has(entry.token)) {
      continue;
    }
    seen.set(entry.token, {
      token: entry.token,
      prob: toProbability(entry.logprob),
      chosen: false,
    });
  }

  return [...seen.values()].sort((left, right) => (right.prob ?? 0) - (left.prob ?? 0));
}

/**
 * Builds the corridor. Pure and O(n) over frames, so the live scene can call it
 * on every token and diff the result rather than rebuilding GPU buffers.
 */
export function buildCorridor(frames, { cadenceMs = 20 } = {}) {
  const waypoints = [];
  const alternates = [];
  let distance = 0;

  for (const frame of frames) {
    distance += forwardStep(frame.delayMs, cadenceMs);
    const prob = frame.prob;
    const certainty = prob == null ? 0.5 : clamp(prob, 0, 1);
    const position = { x: 0, y: altitude(prob), z: -distance };

    const candidates = candidatesFor(frame);
    const losers = candidates.filter((candidate) => !candidate.chosen).slice(0, 4);

    losers.forEach((candidate, rank) => {
      /* Golden-angle spacing keeps rings from lining up down the corridor. */
      const angle = rank * 2.399963 + waypoints.length * 0.618;
      const gap = clamp(1 - (candidate.prob ?? 0), 0, 1);
      const radius = RING_MIN + gap * (RING_MAX - RING_MIN);
      alternates.push({
        frameIndex: frame.index,
        token: candidate.token,
        label: readableToken(candidate.token),
        prob: candidate.prob,
        position: {
          x: position.x + Math.cos(angle) * radius,
          y: position.y + Math.sin(angle) * radius,
          z: position.z,
        },
      });
    });

    waypoints.push({
      frameIndex: frame.index,
      token: frame.text,
      label: readableToken(frame.text),
      prob,
      band: frame.band,
      delayMs: frame.delayMs,
      isPrefill: frame.isPrefill,
      position,
      halo: HALO_MIN + (1 - certainty) * (HALO_MAX - HALO_MIN),
      candidates,
    });
  }

  return {
    waypoints,
    alternates,
    length: distance,
  };
}

/**
 * The moments worth flying a camera to. Ordered as a story: the wait before it
 * spoke, the longest hesitation, the closest call, the least certain word.
 */
export function corridorEvents(analysis, corridor) {
  const frames = analysis?.frames ?? [];
  if (frames.length === 0) {
    return [];
  }

  const events = [];
  const at = (index) => corridor.waypoints.find((point) => point.frameIndex === index) ?? null;

  const first = frames[0];
  events.push({
    kind: "hold",
    index: first.index,
    title: "Before it said anything",
    detail: `The model read your prompt for ${first.delayMs.toFixed(0)} ms, then committed to “${readableToken(first.text)}”.`,
    waypoint: at(first.index),
  });

  const decode = frames.slice(1);
  const longest = decode.reduce(
    (best, frame) => (best === null || frame.delayMs > best.delayMs ? frame : best),
    null,
  );
  if (longest) {
    events.push({
      kind: "stall",
      index: longest.index,
      title: "Longest hesitation",
      detail: `It paused ${longest.delayMs.toFixed(0)} ms before “${readableToken(longest.text)}”.`,
      waypoint: at(longest.index),
    });
  }

  const contested = frames.reduce((best, frame) => {
    if (frame.margin == null) {
      return best;
    }
    return best === null || Math.abs(frame.margin) < Math.abs(best.margin) ? frame : best;
  }, null);
  if (contested?.runnerUp) {
    events.push({
      kind: "tie",
      index: contested.index,
      title: "Closest call",
      detail: `“${readableToken(contested.text)}” beat “${readableToken(contested.runnerUp.token)}” by ${Math.abs(contested.margin).toFixed(2)} logprob.`,
      waypoint: at(contested.index),
    });
  }

  const weakest = frames.reduce((best, frame) => {
    if (frame.prob == null) {
      return best;
    }
    return best === null || frame.prob < best.prob ? frame : best;
  }, null);
  if (weakest) {
    events.push({
      kind: "guess",
      index: weakest.index,
      title: "Least certain word",
      detail: `“${readableToken(weakest.text)}” carried only ${((weakest.prob ?? 0) * 100).toFixed(1)}% of the probability it reported.`,
      waypoint: at(weakest.index),
    });
  }

  return events.filter((event) => event.waypoint !== null);
}
