import { useMemo, useState } from "react";
import { TokenStream } from "./TokenStream.jsx";
import { latencyCeiling } from "../lib/charts.js";

const EMPTY = new Set();

/**
 * What the model actually said, kept deliberately subordinate to the scene.
 * It is collapsible because on a first run the words are the reward, and on a
 * fifth run they are in the way of the route.
 */
export function ReadingPanel({ frames, selected, onSelect, live }) {
  const [open, setOpen] = useState(true);

  /* Anomaly marks belong to Analytics; the baseline bar stays because pace is
     the one measurement that reads naturally against running text. */
  const ceiling = useMemo(
    () => latencyCeiling(frames.filter((f) => !f.isPrefill).map((f) => f.delayMs)),
    [frames],
  );

  return (
    <section className={open ? "reading is-open" : "reading"}>
      <div className="reading__head">
        <h2>Transcript</h2>
        <button
          type="button"
          className="btn btn--quiet"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open ? (
        <TokenStream
          frames={frames}
          selected={selected}
          onSelect={onSelect}
          live={live}
          stallSet={EMPTY}
          tieSet={EMPTY}
          guessSet={EMPTY}
          latencyCeilingMs={ceiling}
        />
      ) : null}
    </section>
  );
}
