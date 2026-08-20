import { describe, expect, it } from "vitest";
import {
  detectDevice,
  detectWebGpu,
  formatCoresLabel,
  formatGpuLabel,
  formatRamLabel,
  readDeviceMemory,
  readHardwareConcurrency,
} from "./webgpu.js";

describe("webgpu device probe", () => {
  it("reports missing WebGPU clearly", async () => {
    const result = await detectWebGpu(undefined);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/WebGPU is not available/i);
  });

  it("reads adapter info when WebGPU is present", async () => {
    const result = await detectWebGpu({
      requestAdapter: async () => ({
        info: {
          vendor: "apple",
          architecture: "metal-3",
          device: "",
          description: "Apple M2",
        },
      }),
    });
    expect(result.available).toBe(true);
    expect(result.vendor).toBe("apple");
    expect(result.architecture).toBe("metal-3");
    expect(result.description).toBe("Apple M2");
    expect(formatGpuLabel(result)).toBe("apple · metal-3 · Apple M2");
  });

  it("formats coarse RAM and CPU hints", async () => {
    const device = await detectDevice({
      gpu: {
        requestAdapter: async () => ({ info: { vendor: "nvidia", architecture: "ampere" } }),
      },
      navigator: { deviceMemory: 8, hardwareConcurrency: 10, gpu: true },
    });
    expect(device.memoryGb).toBe(8);
    expect(device.cores).toBe(10);
    expect(formatRamLabel(device)).toBe("~8 GB RAM");
    expect(formatCoresLabel(device)).toBe("10 threads");
  });

  it("treats missing Device Memory as unknown, not zero", () => {
    expect(readDeviceMemory({})).toBeNull();
    expect(readHardwareConcurrency({})).toBeNull();
    expect(formatRamLabel({ memoryGb: null })).toBe("RAM unknown");
    expect(formatGpuLabel(null)).toBe("Detecting GPU…");
  });
});
