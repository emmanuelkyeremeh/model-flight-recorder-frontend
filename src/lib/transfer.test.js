import { describe, expect, it } from "vitest";
import {
  deriveTransfer,
  formatEta,
  formatMegabytes,
  formatRate,
  parseWebllmProgressText,
  TRANSFER_STAGE,
  transferHeadline,
} from "./transfer.js";

describe("transfer", () => {
  it("parses WebLLM fetch progress text", () => {
    const parsed = parseWebllmProgressText(
      "Fetching param cache[12/24]: 84MB fetched. 41% completed, 8 secs elapsed. It can take a while when we first visit this page to populate the cache.",
    );
    expect(parsed.stage).toBe(TRANSFER_STAGE.DOWNLOAD);
    expect(parsed.fetchedMb).toBe(84);
    expect(parsed.percent).toBe(41);
    expect(parsed.shard).toBe(12);
    expect(parsed.shardCount).toBe(24);
    expect(parsed.elapsedSec).toBe(8);
  });

  it("parses cache-load progress text", () => {
    const parsed = parseWebllmProgressText(
      "Loading model from cache[3/8]: 40MB loaded. 50% completed, 1 secs elapsed.",
    );
    expect(parsed.stage).toBe(TRANSFER_STAGE.CACHE);
    expect(parsed.fetchedMb).toBe(40);
  });

  it("derives rate and ETA from bytes and elapsed time", () => {
    const transfer = deriveTransfer({
      progress: 0.41,
      timeElapsed: 8,
      text: "Fetching param cache[12/24]: 84MB fetched. 41% completed, 8 secs elapsed.",
      totalMb: 204,
    });
    expect(transfer.percent).toBe(41);
    expect(transfer.rateMbPerS).toBeCloseTo(10.5, 1);
    expect(transfer.etaSec).toBeGreaterThan(10);
    expect(transferHeadline(transfer)).toBe("Downloading");
  });

  it("formats download-style units", () => {
    expect(formatMegabytes(84.2)).toBe("84 MB");
    expect(formatMegabytes(2.3)).toBe("2.3 MB");
    expect(formatRate(2.14)).toBe("2.1 MB/s");
    expect(formatEta(12.2)).toBe("12s left");
    expect(formatEta(75)).toBe("1m 15s left");
  });
});
