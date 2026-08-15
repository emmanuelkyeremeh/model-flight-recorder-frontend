import { useEffect, useRef } from "react";

function visible(text) {
  if (text === "\n") {
    return "\\n";
  }
  if (text.trim() === "") {
    return "␣";
  }
  return text;
}

function fixed(value, digits = 1) {
  if (value === null || value === undefined) {
    return "—";
  }
  return value.toFixed(digits);
}

/**
 * Every token as a row, with the confidence bar drawn in the cell rather than
 * in a separate chart. Sticky header, numbers right-aligned on tabular
 * figures, hairline rules instead of zebra so the inline bars stay readable.
 */
export function ContactSheet({ frames, selected, onSelect, stallSet, tieSet, guessSet }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    const row = bodyRef.current?.querySelector('[aria-selected="true"]');
    if (typeof row?.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  return (
    <div className="sheet">
      <table>
        <thead>
          <tr>
            <th scope="col" className="col-idx">#</th>
            <th scope="col">Token</th>
            <th scope="col" className="col-num">Δt ms</th>
            <th scope="col" className="col-num">p %</th>
            <th scope="col" className="col-bar">Confidence</th>
            <th scope="col" className="col-num">Margin</th>
            <th scope="col">Runner-up</th>
            <th scope="col" className="col-flags">Flags</th>
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {frames.map((frame) => (
            <tr
              key={frame.index}
              aria-selected={frame.index === selected}
              className={frame.index === selected ? "is-selected" : undefined}
              onClick={() => onSelect(frame.index)}
            >
              <td className="col-idx">{String(frame.index + 1).padStart(3, "0")}</td>
              <td><code>{visible(frame.text)}</code></td>
              <td className={stallSet.has(frame.index) ? "col-num is-stall" : "col-num"}>
                {fixed(frame.delayMs, 1)}
              </td>
              <td className="col-num">
                {frame.prob == null ? "—" : (frame.prob * 100).toFixed(1)}
              </td>
              <td className="col-bar">
                <span className={`inbar inbar--${frame.band}`}>
                  <i style={{ transform: `scaleX(${Math.max(0.004, frame.prob ?? 0)})` }} />
                </span>
              </td>
              <td className="col-num">{fixed(frame.margin, 2)}</td>
              <td className="col-alt">
                <code>{frame.runnerUp ? visible(frame.runnerUp.token) : "—"}</code>
              </td>
              <td className="col-flags">
                {stallSet.has(frame.index) ? <b className="mark mark--s">S</b> : null}
                {tieSet.has(frame.index) ? <b className="mark mark--t">T</b> : null}
                {guessSet.has(frame.index) ? <b className="mark mark--g">G</b> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
