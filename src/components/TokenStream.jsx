import { useEffect, useRef } from "react";

const LAT_BAR_MAX_PX = 7;

function stepKey(event) {
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
    case "j":
      return 1;
    case "ArrowLeft":
    case "ArrowUp":
    case "k":
      return -1;
    default:
      return 0;
  }
}

function marks(frame, stallSet, tieSet, guessSet) {
  const classes = ["tok"];
  if (stallSet.has(frame.index)) {
    classes.push("tok--stall");
  }
  if (tieSet.has(frame.index)) {
    classes.push("tok--tie");
  }
  if (guessSet.has(frame.index)) {
    classes.push("tok--guess");
  }
  if (frame.prob == null) {
    classes.push("tok--unscored");
  }
  return classes;
}

function describe(frame) {
  const parts = [`token ${frame.index + 1}`, JSON.stringify(frame.text)];
  parts.push(`${frame.delayMs.toFixed(0)} milliseconds`);
  if (frame.prob != null) {
    parts.push(`${(frame.prob * 100).toFixed(0)} percent`);
  }
  return parts.join(", ");
}

/**
 * The generated passage, with two measurements written onto the type itself:
 * uncertainty as a warm wash behind the glyph, and the gap before it as a bar
 * along the baseline. The glyph keeps full-contrast ink at every heat level so
 * the passage stays readable, and each anomaly carries a shape as well as a
 * colour.
 */
export function TokenStream({
  frames,
  selected,
  onSelect,
  live,
  stallSet,
  tieSet,
  guessSet,
  latencyCeilingMs,
}) {
  const listRef = useRef(null);

  useEffect(() => {
    if (!live) {
      return;
    }
    const node = listRef.current;
    if (typeof node?.scrollTo === "function") {
      node.scrollTo({ top: node.scrollHeight });
    }
  }, [frames.length, live]);

  function onKeyDown(event) {
    const step = stepKey(event);
    if (step !== 0) {
      event.preventDefault();
      const next = Math.min(frames.length - 1, Math.max(0, selected + step));
      onSelect(next);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      onSelect(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      onSelect(frames.length - 1);
    }
  }

  if (!frames.length) {
    return (
      <div className="stream stream--empty">
        <p>{live ? "Waiting on the first token." : "No tokens yet."}</p>
      </div>
    );
  }

  return (
    <div
      className="stream"
      ref={listRef}
      role="listbox"
      tabIndex={0}
      aria-label="Generated tokens. Arrow keys step through them."
      aria-activedescendant={`tok-${selected}`}
      onKeyDown={onKeyDown}
    >
      {frames.map((frame) => {
        const heat = frame.prob == null ? 0 : 1 - frame.prob;
        const bar = Math.max(
          1,
          Math.round((Math.min(frame.delayMs, latencyCeilingMs) / latencyCeilingMs) * LAT_BAR_MAX_PX),
        );
        const classes = marks(frame, stallSet, tieSet, guessSet);
        if (frame.index === selected) {
          classes.push("is-selected");
        }
        return (
          <span
            key={frame.index}
            id={`tok-${frame.index}`}
            role="option"
            aria-selected={frame.index === selected}
            aria-label={describe(frame)}
            className={classes.join(" ")}
            style={{ "--heat": heat.toFixed(3), "--lat": `${bar}px` }}
            onClick={() => onSelect(frame.index)}
          >
            {frame.text}
            <i className="tok__lat" aria-hidden="true" />
          </span>
        );
      })}
      {live ? <span className="stream__caret" aria-hidden="true" /> : null}
    </div>
  );
}
