import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.jsx";
import { createMockEngine } from "./lib/engine/mockEngine.js";

afterEach(() => {
  cleanup();
});

const availableGpu = async () => ({
  available: true,
  vendor: "test-gpu",
  device: "jsdom",
  reason: null,
});

function renderApp(tokens = ["Hello", " world"]) {
  return render(
    <App
      engineFactory={async () => createMockEngine({ tokens })}
      detectGpu={availableGpu}
    />,
  );
}

describe("App", () => {
  it("does not start a download until consent is given", () => {
    let loadCount = 0;
    const engineFactory = async () => {
      const engine = createMockEngine({ tokens: ["ok"] });
      const originalLoad = engine.load.bind(engine);
      engine.load = async (...args) => {
        loadCount += 1;
        return originalLoad(...args);
      };
      return engine;
    };

    render(<App engineFactory={engineFactory} detectGpu={availableGpu} />);
    expect(screen.getByRole("button", { name: /download & load/i })).toBeTruthy();
    expect(loadCount).toBe(0);
    expect(screen.getAllByText(/IDLE/).length).toBeGreaterThan(0);
  });

  it("opens on the vocabulary brief with no measurements invented", () => {
    renderApp();

    expect(screen.getByText(/can choose next/i)).toBeTruthy();
    /* SmolLM2's published vocab_size, formatted. */
    expect(screen.getByText(/49,152/)).toBeTruthy();
    expect(screen.queryByRole("listbox", { name: /generated tokens/i })).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("offers on-screen navigation for anyone who does not know the gestures", () => {
    renderApp();

    const pad = screen.getByRole("group", { name: /scene navigation/i });
    const keys = [
      /zoom in/i,
      /zoom out/i,
      /orbit left/i,
      /orbit right/i,
      /tilt up/i,
      /tilt down/i,
      /level the view/i,
      /recentre/i,
    ];

    for (const key of keys) {
      fireEvent.click(within(pad).getByRole("button", { name: key }));
    }

    expect(within(pad).getAllByRole("button").length).toBe(keys.length);
    expect(screen.getByText(/drag to orbit/i)).toBeTruthy();
  });

  it("toggles between dark and light without leaving the flight view", () => {
    renderApp();

    const toggle = screen.getByRole("button", { name: /switch to light mode/i });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps analytics shut until there is something to analyse", () => {
    renderApp();

    expect(screen.getByRole("tab", { name: /analytics/i }).disabled).toBe(true);
  });

  it("records a run, then offers the transcript, transport and analytics", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /download & load/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^run$/i }).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/COMPLETE/).length).toBeGreaterThan(0);
    });

    const stream = screen.getByRole("listbox", { name: /generated tokens/i });
    expect(within(stream).getByText("Hello")).toBeTruthy();
    expect(screen.getByRole("button", { name: /export fdr/i })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /scrub/i })).toBeTruthy();
    expect(screen.queryByText(/can choose next/i)).toBeNull();
    expect(screen.queryByText(/Invalid receipt/i)).toBeNull();

    const analytics = screen.getByRole("tab", { name: /analytics/i });
    expect(analytics.disabled).toBe(false);
    fireEvent.click(analytics);
    expect(screen.getByText(/per-token record/i)).toBeTruthy();
    /* Nothing to navigate while the numbers are up. */
    expect(screen.queryByRole("group", { name: /scene navigation/i })).toBeNull();
  });

  it("steps the transcript selection with the keyboard", async () => {
    renderApp(["Hello", " world", " again"]);

    fireEvent.click(screen.getByRole("button", { name: /download & load/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^run$/i }).disabled).toBe(false);
    });
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/COMPLETE/).length).toBeGreaterThan(0);
    });

    const stream = screen.getByRole("listbox", { name: /generated tokens/i });
    fireEvent.keyDown(stream, { key: "Home" });
    expect(stream.getAttribute("aria-activedescendant")).toBe("tok-0");
    fireEvent.keyDown(stream, { key: "ArrowRight" });
    expect(stream.getAttribute("aria-activedescendant")).toBe("tok-1");
  });
});
