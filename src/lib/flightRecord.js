import { percentile, roundTo } from "./telemetry.js";

/**
 * @typedef {{ text: string, at: number, logprob: number | null, alternatives: Array<{ token: string, logprob: number }> }} TokenEvent
 * @typedef {{
 *   runId: string,
 *   modelId: string,
 *   prompt: string,
 *   startedAt: number,
 *   firstTokenAt: number | null,
 *   finishedAt: number | null,
 *   tokens: TokenEvent[],
 *   usage: object | null,
 * }} FlightRecord
 */

export function createFlightRecord({ runId, modelId, prompt, startedAt }) {
  if (!runId || !modelId) {
    throw new Error("runId and modelId are required.");
  }

  return {
    runId,
    modelId,
    prompt: prompt ?? "",
    startedAt,
    firstTokenAt: null,
    finishedAt: null,
    tokens: [],
    usage: null,
  };
}

export function appendToken(record, event) {
  if (typeof event.at !== "number") {
    throw new Error("Token event requires a timestamp.");
  }

  const next = {
    ...record,
    tokens: [...record.tokens, {
      text: event.text ?? "",
      at: event.at,
      logprob: event.logprob ?? null,
      alternatives: event.alternatives ?? [],
    }],
  };

  if (next.firstTokenAt === null) {
    next.firstTokenAt = event.at;
  }

  return next;
}

export function finishRecord(record, usage, finishedAt) {
  return {
    ...record,
    usage: usage ?? null,
    finishedAt,
  };
}

export function interTokenLatenciesMs(record) {
  const times = [];
  if (record.firstTokenAt !== null) {
    times.push(record.firstTokenAt);
  }
  for (const token of record.tokens.slice(1)) {
    times.push(token.at);
  }

  const intervals = [];
  for (let index = 1; index < times.length; index += 1) {
    intervals.push(times[index] - times[index - 1]);
  }
  return intervals;
}

export function summarizeRecord(record) {
  const ttftMs = record.firstTokenAt === null
    ? null
    : record.firstTokenAt - record.startedAt;

  const itl = interTokenLatenciesMs(record);
  const tokensOut = record.tokens.length;
  const wallMs = (record.finishedAt ?? record.tokens.at(-1)?.at ?? record.startedAt) - record.startedAt;
  const decodeMs = record.firstTokenAt === null
    ? null
    : (record.finishedAt ?? record.tokens.at(-1)?.at ?? record.firstTokenAt) - record.firstTokenAt;

  const tokPerS = decodeMs && decodeMs > 0 && tokensOut > 1
    ? ((tokensOut - 1) / decodeMs) * 1000
    : null;

  const usageTokPerS = record.usage?.extra?.decode_tokens_per_s;
  const usageTtftMs = record.usage?.extra?.time_to_first_token_s != null
    ? record.usage.extra.time_to_first_token_s * 1000
    : null;

  return {
    ttftMs: roundTo(usageTtftMs ?? ttftMs, 1),
    itlMsP50: roundTo(percentile(itl, 50), 1),
    itlMsP95: roundTo(percentile(itl, 95), 1),
    tokensOut,
    tokPerS: roundTo(typeof usageTokPerS === "number" ? usageTokPerS : tokPerS, 2),
    promptTokens: record.usage?.prompt_tokens ?? null,
    wallMs: roundTo(wallMs, 1),
    itl,
  };
}
