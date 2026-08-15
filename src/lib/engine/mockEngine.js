import { PHASE_EVENT } from "../phases.js";

const DEFAULT_TOKENS = ["Flight", " strip", " locked", ".", " TTFT", " marked", "."];
const DEFAULT_ITL_MS = 40;
const DEFAULT_TTFT_MS = 180;
const PROGRESS_STEPS = 5;

function delay(ms, clock) {
  if (clock) {
    clock.advance(ms);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Deterministic engine for tests and ?engine=mock. Never downloads weights.
 */
export function createMockEngine(options = {}) {
  const tokens = options.tokens ?? DEFAULT_TOKENS;
  const itlMs = options.itlMs ?? DEFAULT_ITL_MS;
  const ttftMs = options.ttftMs ?? DEFAULT_TTFT_MS;
  const clock = options.clock ?? null;
  let loadedModelId = null;
  let interrupted = false;

  return {
    kind: "mock",
    async load(modelId, onProgress) {
      interrupted = false;
      const totalMb = options.totalMb ?? 204;
      for (let step = 1; step <= PROGRESS_STEPS; step += 1) {
        const progress = step / PROGRESS_STEPS;
        const fetchedMb = Math.ceil(progress * totalMb);
        const elapsedSec = step;
        onProgress?.({
          event: PHASE_EVENT.DOWNLOAD_PROGRESS,
          progress,
          timeElapsed: elapsedSec,
          detail: `Fetching param cache[${step}/${PROGRESS_STEPS}]: ${fetchedMb}MB fetched. ${Math.floor(progress * 100)}% completed, ${elapsedSec} secs elapsed.`,
        });
        await delay(clock ? 0 : 40, clock);
      }
      loadedModelId = modelId;
    },
    async generate({ messages, onToken, onUsage }) {
      if (!loadedModelId) {
        throw new Error("Mock engine is not armed.");
      }
      interrupted = false;
      const now = () => (clock ? clock.now() : performance.now());
      const started = now();
      await delay(ttftMs, clock);

      let lastAt = started + ttftMs;
      for (let index = 0; index < tokens.length; index += 1) {
        if (interrupted) {
          break;
        }
        const text = tokens[index];
        onToken({
          text,
          at: lastAt,
          logprob: -0.12 - (index % 4) * 0.55,
          alternatives: [
            { token: text, logprob: -0.12 - (index % 4) * 0.55 },
            { token: index % 2 === 0 ? "the" : "a", logprob: -0.7 - (index % 3) * 0.4 },
            { token: "…", logprob: -2.1 },
          ],
        });
        lastAt += itlMs;
        await delay(itlMs, clock);
      }

      onUsage?.({
        prompt_tokens: typeof messages?.[0]?.content === "string" ? messages[0].content.length : 0,
        completion_tokens: tokens.length,
        extra: {
          e2e_latency_s: (lastAt - started) / 1000,
          prefill_tokens_per_s: 100,
          decode_tokens_per_s: 1000 / itlMs,
          time_to_first_token_s: ttftMs / 1000,
          time_per_output_token_s: itlMs / 1000,
        },
      });
    },
    interrupt() {
      interrupted = true;
    },
    async unload() {
      loadedModelId = null;
    },
  };
}

export function createManualClock(start = 0) {
  let current = start;
  return {
    now() {
      return current;
    },
    advance(ms) {
      current += ms;
    },
  };
}
