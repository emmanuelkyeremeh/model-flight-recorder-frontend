const FETCHED_MB = /(\d+(?:\.\d+)?)\s*MB fetched/i;
const LOADED_MB = /(\d+(?:\.\d+)?)\s*MB loaded/i;
const PERCENT = /(\d+)% completed/;
const SHARD = /\[(\d+)\s*\/\s*(\d+)\]/;
const ELAPSED = /(\d+)\s*secs elapsed/;

export const TRANSFER_STAGE = Object.freeze({
  START: "start",
  DOWNLOAD: "download",
  CACHE: "cache",
  COMPILE: "compile",
});

export function parseWebllmProgressText(text) {
  const source = text ?? "";
  const fetched = source.match(FETCHED_MB);
  const loaded = source.match(LOADED_MB);
  const percent = source.match(PERCENT);
  const shard = source.match(SHARD);
  const elapsed = source.match(ELAPSED);

  let stage = TRANSFER_STAGE.DOWNLOAD;
  const lower = source.toLowerCase();
  if (lower.includes("compil") || lower.includes("shader")) {
    stage = TRANSFER_STAGE.COMPILE;
  } else if (lower.includes("loading model from cache") || loaded) {
    stage = TRANSFER_STAGE.CACHE;
  } else if (lower.includes("start to fetch")) {
    stage = TRANSFER_STAGE.START;
  }

  return {
    stage,
    fetchedMb: fetched ? Number(fetched[1]) : loaded ? Number(loaded[1]) : null,
    percent: percent ? Number(percent[1]) : null,
    shard: shard ? Number(shard[1]) : null,
    shardCount: shard ? Number(shard[2]) : null,
    elapsedSec: elapsed ? Number(elapsed[1]) : null,
  };
}

export function deriveTransfer({ progress, timeElapsed, text, totalMb }) {
  const parsed = parseWebllmProgressText(text);
  const ratio = clampRatio(progress);
  const percent = parsed.percent ?? Math.round(ratio * 100);
  const fetchedMb = parsed.fetchedMb ?? Number((ratio * (totalMb ?? 0)).toFixed(1));
  const elapsedSec = parsed.elapsedSec ?? (typeof timeElapsed === "number" ? timeElapsed : 0);
  const rateMbPerS = elapsedSec > 0 && fetchedMb > 0 ? fetchedMb / elapsedSec : null;
  const remainingMb = Math.max(0, (totalMb ?? 0) - fetchedMb);
  const etaSec = rateMbPerS && rateMbPerS > 0 ? remainingMb / rateMbPerS : null;

  return {
    stage: parsed.stage,
    percent: clampPercent(percent),
    fetchedMb,
    totalMb: totalMb ?? 0,
    elapsedSec,
    rateMbPerS,
    etaSec,
    shard: parsed.shard,
    shardCount: parsed.shardCount,
    text: text ?? "",
  };
}

export function formatMegabytes(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  if (value >= 10) {
    return `${Math.round(value)} MB`;
  }
  return `${value.toFixed(1)} MB`;
}

export function formatRate(rateMbPerS) {
  if (rateMbPerS === null || rateMbPerS === undefined || !Number.isFinite(rateMbPerS) || rateMbPerS <= 0) {
    return "—";
  }
  return `${rateMbPerS.toFixed(1)} MB/s`;
}

export function formatEta(etaSec) {
  if (etaSec === null || etaSec === undefined || !Number.isFinite(etaSec)) {
    return "—";
  }
  if (etaSec < 1) {
    return "<1s left";
  }
  if (etaSec < 60) {
    return `${Math.round(etaSec)}s left`;
  }
  const minutes = Math.floor(etaSec / 60);
  const seconds = Math.round(etaSec % 60);
  return `${minutes}m ${seconds}s left`;
}

export function transferHeadline(transfer) {
  if (!transfer) {
    return "Waiting to download";
  }
  switch (transfer.stage) {
    case TRANSFER_STAGE.COMPILE:
      return "Compiling shaders";
    case TRANSFER_STAGE.CACHE:
      return "Loading from cache";
    case TRANSFER_STAGE.START:
      return "Starting download";
    case TRANSFER_STAGE.DOWNLOAD:
      return "Downloading";
    default: {
      const exhaustive = transfer.stage;
      throw new Error(`Unhandled transfer stage: ${exhaustive}`);
    }
  }
}

function clampRatio(progress) {
  if (typeof progress !== "number" || Number.isNaN(progress)) {
    return 0;
  }
  return Math.min(1, Math.max(0, progress));
}

function clampPercent(percent) {
  return Math.min(100, Math.max(0, percent));
}
