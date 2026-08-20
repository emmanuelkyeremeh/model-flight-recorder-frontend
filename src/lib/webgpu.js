/**
 * What the browser is willing to say about this machine. GPU identity comes
 * from WebGPU adapter info; RAM is navigator.deviceMemory — a fingerprint-
 * bucketed estimate (typically 2 / 4 / 8 / 16 / 32), not exact GiB, and not
 * available in every browser. VRAM size is never exposed.
 */

export async function detectWebGpu(gpu = typeof navigator !== "undefined" ? navigator.gpu : undefined) {
  if (!gpu) {
    return {
      available: false,
      vendor: null,
      architecture: null,
      device: null,
      description: null,
      reason: "WebGPU is not available. Use Chrome 113+, Edge 113+, or Safari 26+.",
    };
  }

  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        available: false,
        vendor: null,
        architecture: null,
        device: null,
        description: null,
        reason: "No WebGPU adapter. Close other GPU-heavy tabs or try another browser.",
      };
    }

    const info = adapter.info ?? {};
    return {
      available: true,
      vendor: cleanInfo(info.vendor),
      architecture: cleanInfo(info.architecture),
      device: cleanInfo(info.device),
      description: cleanInfo(info.description),
      reason: null,
    };
  } catch (error) {
    return {
      available: false,
      vendor: null,
      architecture: null,
      device: null,
      description: null,
      reason: error instanceof Error ? error.message : "WebGPU adapter request failed.",
    };
  }
}

/**
 * GPU adapter plus coarse RAM / CPU hints for the hardware strip.
 * @param {{ gpu?: GPU, navigator?: Navigator }} [deps]
 */
export async function detectDevice(deps = {}) {
  const nav = deps.navigator
    ?? (typeof navigator !== "undefined" ? navigator : undefined);
  const gpuApi = deps.gpu ?? nav?.gpu;
  const gpu = await detectWebGpu(gpuApi);

  return {
    ...gpu,
    memoryGb: readDeviceMemory(nav),
    cores: readHardwareConcurrency(nav),
  };
}

export function readDeviceMemory(nav = typeof navigator !== "undefined" ? navigator : undefined) {
  if (!nav || typeof nav.deviceMemory !== "number" || Number.isNaN(nav.deviceMemory)) {
    return null;
  }
  return nav.deviceMemory;
}

export function readHardwareConcurrency(nav = typeof navigator !== "undefined" ? navigator : undefined) {
  if (!nav || typeof nav.hardwareConcurrency !== "number" || Number.isNaN(nav.hardwareConcurrency)) {
    return null;
  }
  return nav.hardwareConcurrency;
}

/** Short label for the GPU row in the dock. */
export function formatGpuLabel(device) {
  if (!device) {
    return "Detecting GPU…";
  }
  if (!device.available) {
    return "GPU unavailable";
  }
  const parts = uniqueNonEmpty([
    device.vendor,
    device.architecture,
    device.device,
    device.description,
  ]);
  return parts.length > 0 ? parts.join(" · ") : "WebGPU adapter";
}

/** Short label for the RAM row — always framed as approximate. */
export function formatRamLabel(device) {
  if (!device || device.memoryGb == null) {
    return "RAM unknown";
  }
  return `~${device.memoryGb} GB RAM`;
}

export function formatCoresLabel(device) {
  if (!device || device.cores == null) {
    return null;
  }
  return `${device.cores} threads`;
}

export function describeBrowser(nav = typeof navigator !== "undefined" ? navigator : undefined) {
  if (!nav) {
    return "unknown";
  }
  return nav.userAgent;
}

function cleanInfo(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueNonEmpty(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value);
  }
  return out;
}
