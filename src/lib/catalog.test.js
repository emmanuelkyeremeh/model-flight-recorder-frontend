import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID, getDefaultModel, getModelById, isStressModel, MODEL_CATALOG } from "../lib/catalog.js";

describe("catalog", () => {
  it("defaults to SmolLM2 360M", () => {
    expect(getDefaultModel().id).toBe(DEFAULT_MODEL_ID);
    expect(getDefaultModel().downloadMb).toBeLessThan(250);
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
});
