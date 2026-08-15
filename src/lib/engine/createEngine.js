import { createMockEngine } from "./mockEngine.js";

/**
 * WebLLM is loaded through a dynamic import so the landing bundle stays
 * free of the WASM/WebGPU engine until the user consents to download.
 */
export async function createEngine(kind = "auto") {
  if (kind === "mock" || shouldUseMock(kind)) {
    return createMockEngine();
  }

  const { createWebllmEngine } = await import("./webllmEngine.js");
  return createWebllmEngine();
}

function shouldUseMock(kind) {
  if (kind === "webllm") {
    return false;
  }
  if (import.meta.env.MODE === "test") {
    return true;
  }
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    return params.get("engine") === "mock";
  }
  return false;
}
