export async function detectWebGpu() {
  if (typeof navigator === "undefined" || !navigator.gpu) {
    return {
      available: false,
      vendor: null,
      device: null,
      reason: "WebGPU is not available. Use Chrome 113+, Edge 113+, or Safari 26+.",
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        available: false,
        vendor: null,
        device: null,
        reason: "No WebGPU adapter. Close other GPU-heavy tabs or try another browser.",
      };
    }

    const info = adapter.info ?? {};
    return {
      available: true,
      vendor: info.vendor ?? null,
      device: info.device ?? null,
      reason: null,
    };
  } catch (error) {
    return {
      available: false,
      vendor: null,
      device: null,
      reason: error instanceof Error ? error.message : "WebGPU adapter request failed.",
    };
  }
}

export function describeBrowser() {
  if (typeof navigator === "undefined") {
    return "unknown";
  }
  return navigator.userAgent;
}
