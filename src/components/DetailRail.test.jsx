import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DetailRail } from "./DetailRail.jsx";

afterEach(cleanup);

const FRAME = Object.freeze({
  index: 3,
  text: " strip",
  delayMs: 41.2,
  prob: 0.512,
  logprob: Math.log(0.512),
  margin: 0.42,
  band: "split",
  isPrefill: false,
  alternatives: [
    { token: " strip", logprob: Math.log(0.512) },
    { token: " deck", logprob: Math.log(0.333) },
    { token: " plan", logprob: Math.log(0.122) },
  ],
});

/** Tokens carry their leading space, which text matchers would normalise away. */
function rowFor(token) {
  const code = [...document.querySelectorAll(".wedge__row code")]
    .find((node) => node.textContent === token);
  return code?.closest("li");
}

describe("DetailRail", () => {
  it("marks the token the model sampled", () => {
    render(<DetailRail frame={FRAME} total={7} />);

    expect(rowFor(" strip").className).toContain("is-chosen");
    expect(rowFor(" deck").className).not.toContain("is-chosen");
  });

  it("marks the rejected candidate whose node was clicked in the scene", () => {
    render(<DetailRail frame={FRAME} total={7} candidate=" deck" />);

    expect(rowFor(" deck").className).toContain("is-picked");
    expect(rowFor(" plan").className).not.toContain("is-picked");
    /* The sampled token keeps its own mark: a click adds a note, not a claim. */
    expect(rowFor(" strip").className).toContain("is-chosen");
  });

  it("says where the candidates come from, since the field is not a distribution", () => {
    render(<DetailRail frame={FRAME} total={7} />);

    fireEvent.click(screen.getByRole("button", { name: /what it weighed/i }));

    expect(screen.getByText(/never the whole\s+vocabulary/i)).toBeTruthy();
  });
});
