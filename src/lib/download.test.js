import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "./download.js";

describe("sanitizeFilename", () => {
  it("strips path separators and control characters", () => {
    expect(sanitizeFilename("../../evil.json")).toBe("..-..-evil.json");
    expect(sanitizeFilename("ok-run.json")).toBe("ok-run.json");
    expect(sanitizeFilename("")).toBe("download");
  });
});
