import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL_ID,
  formatModelOption,
  getDefaultModel,
  getModelById,
  isStressModel,
  MODEL_CATALOG,
} from "./catalog.js";

describe("catalog", () => {
  it("defaults to SmolLM2 360M", () => {
    expect(getDefaultModel().id).toBe(DEFAULT_MODEL_ID);
    expect(getDefaultModel().downloadMb).toBeLessThan(250);
  });

  it("offers a ladder from 135M through 3B", () => {
    const ids = MODEL_CATALOG.map((model) => model.id);
    expect(ids).toContain("SmolLM2-135M-Instruct-q0f16-MLC");
    expect(ids).toContain("gemma3-1b-it-q4f16_1-MLC");
    expect(ids).toContain("Qwen3-0.6B-q4f16_1-MLC");
    expect(ids).toContain("SmolLM2-1.7B-Instruct-q4f16_1-MLC");
    expect(ids).toContain("Llama-3.2-3B-Instruct-q4f16_1-MLC");
    expect(MODEL_CATALOG.length).toBeGreaterThanOrEqual(8);
  });

  it("flags catalog entries that carry a warning", () => {
    const llama = getModelById("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    const qwen15 = getModelById("Qwen2.5-1.5B-Instruct-q4f16_1-MLC");
    expect(isStressModel(llama)).toBe(true);
    expect(isStressModel(qwen15)).toBe(true);
    expect(isStressModel(getDefaultModel())).toBe(false);
  });

  it("throws on unknown model ids", () => {
    expect(() => getModelById("not-a-model")).toThrow(/Unknown model/);
  });

  it("keeps unique ids", () => {
    const ids = MODEL_CATALOG.map((model) => model.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("labels options with download and VRAM", () => {
    expect(formatModelOption(getDefaultModel())).toMatch(/360M · 204MB · ~376MB VRAM/);
  });
});
