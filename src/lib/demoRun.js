import { appendToken, createFlightRecord, finishRecord } from "./flightRecord.js";

/* A deterministic sample run, so the instrument is never an empty shell.
   It is synthetic and every surface that shows it must say so — see the
   SAMPLE badge in RunHeader. Numbers are plausible for a 1B model on an
   M-series laptop but they are NOT measurements and must never be quoted
   as such. Built through the real record helpers so it flows the same
   analysis path as a live run. */

const DEMO_RUN_ID = "0d9f5c2e-7a41-4c8b-9e30-1f6b2a5d8c47";
const DEMO_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const DEMO_PROMPT = "Explain time-to-first-token vs inter-token latency in one short paragraph.";

const DEMO_PASSAGE = "Time to first token is the wait before anything appears: the model reads your whole prompt, fills its attention cache, and only then commits to a first word. Inter-token latency is what happens after that, the gap between each word and the next, and it is a very different number. A model can start fast and then stutter, or take a slow breath up front and stream smoothly forever after. Averaging them together hides both problems. Watch the first number to judge how responsive a reply feels, and watch the spread of the second to judge whether reading it feels steady or stalled.";

const TTFT_MS = 182.4;
const BASE_ITL_MS = 13.6;

/* Planted events, so the findings panel and the anomaly marks have
   something honest to point at in the sample. */
const STALL_MS = new Map([[24, 96.2], [25, 38.4], [62, 128.5], [89, 71.9]]);
const GUESS_AT = new Set([7, 44, 80, 103]);
const NEAR_TIE_AT = new Set([12, 31, 47, 59, 71, 96]);

const ALT_POOL = [
  "the", "a", "that", "this", "and", "is", "to", "which", "it", "one",
  "each", "how", "when", "your", "its", "any", "some", "then", "so", "but",
];

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function tokenize(passage) {
  return passage.match(/\s*[^\s]+/g) ?? [];
}

function variantOf(text) {
  const bare = text.trim();
  if (!bare) {
    return "…";
  }
  const lead = text.slice(0, text.length - bare.length);
  if (bare.endsWith("s")) {
    return `${lead}${bare.slice(0, -1)}`;
  }
  if (bare.endsWith(".") || bare.endsWith(",") || bare.endsWith(":")) {
    return `${lead}${bare.slice(0, -1)}`;
  }
  return `${lead}${bare}s`;
}

function altTokens(text, rng) {
  const picks = [variantOf(text)];
  while (picks.length < 3) {
    const candidate = ` ${ALT_POOL[Math.floor(rng() * ALT_POOL.length)]}`;
    if (!picks.includes(candidate) && candidate.trim() !== text.trim()) {
      picks.push(candidate);
    }
  }
  return picks;
}

function probFor(index, rng) {
  if (GUESS_AT.has(index)) {
    return 0.055 + rng() * 0.08;
  }
  if (NEAR_TIE_AT.has(index)) {
    return 0.3 + rng() * 0.12;
  }
  return 0.52 + rng() * 0.45;
}

function alternativesFor({ text, prob, index, rng }) {
  /* A near-tie means the runner-up sits within e^-0.35 of the chosen
     token, which is what analyzeFlight calls a coin-flip. */
  const secondRatio = NEAR_TIE_AT.has(index) ? 0.74 + rng() * 0.2 : 0.16 + rng() * 0.28;
  const secondProb = clamp(prob * secondRatio, 0.002, 0.97);
  const thirdProb = clamp(secondProb * (0.28 + rng() * 0.42), 0.001, 0.9);
  const fourthProb = clamp(thirdProb * (0.2 + rng() * 0.45), 0.0005, 0.8);
  const [first, second, third] = altTokens(text, rng);

  return [
    { token: text, logprob: Math.log(prob) },
    { token: first, logprob: Math.log(secondProb) },
    { token: second, logprob: Math.log(thirdProb) },
    { token: third, logprob: Math.log(fourthProb) },
  ];
}

export function createDemoRecord({ startedAt = 0 } = {}) {
  const rng = mulberry32(0x86e35699);
  const texts = tokenize(DEMO_PASSAGE);

  let record = createFlightRecord({
    runId: DEMO_RUN_ID,
    modelId: DEMO_MODEL_ID,
    prompt: DEMO_PROMPT,
    startedAt,
  });

  let at = startedAt;
  texts.forEach((text, index) => {
    if (index === 0) {
      at += TTFT_MS;
    } else {
      /* Skewed right, the way real decode gaps sit: a floor set by the kernel
         launch, a long thin tail from scheduling. A uniform jitter would give a
         flat histogram no real run produces. */
      const gap = BASE_ITL_MS * (0.78 + (rng() ** 2.3) * 1.9);
      at += STALL_MS.get(index) ?? Math.max(4.2, gap);
    }

    const prob = probFor(index, rng);
    record = appendToken(record, {
      text,
      at,
      logprob: Math.log(prob),
      alternatives: alternativesFor({ text, prob, index, rng }),
    });
  });

  return finishRecord(record, {
    prompt_tokens: 18,
    completion_tokens: texts.length,
    extra: {
      time_to_first_token_s: TTFT_MS / 1000,
      decode_tokens_per_s: ((texts.length - 1) / (at - startedAt - TTFT_MS)) * 1000,
    },
  }, at + 6.1);
}
