import { InfoButton } from "./InfoButton.jsx";

const BAND_WORD = Object.freeze({
  locked: "locked in",
  steady: "steady",
  split: "split",
  guess: "guess",
  unknown: "unscored",
});

function visible(text) {
  if (text === "\n") {
    return "\\n";
  }
  if (text.trim() === "") {
    return `␣${text.length > 1 ? `×${text.length}` : ""}`;
  }
  return text;
}

function pct(value) {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${(value * 100).toFixed(1)}%`;
}

/** Marks the sampled row, and the row whose node was clicked in the scene. */
function rowClass(token, sampled, clicked) {
  const names = ["wedge__row"];
  if (token === sampled) {
    names.push("is-chosen");
  }
  if (clicked != null && token === clicked) {
    names.push("is-picked");
  }
  return names.join(" ");
}

/**
 * Detail-on-demand without a modal: the rail stays put and rewrites itself as
 * the selection moves, the way a trace waterfall sidebar does.
 */
export function DetailRail({ frame, total, stalled, tied, guessed, candidate }) {
  if (!frame) {
    return (
      <aside className="rail">
        <p className="rail__empty">Select a token to inspect it.</p>
      </aside>
    );
  }

  const alternatives = [...(frame.alternatives ?? [])]
    .map((entry) => ({ ...entry, prob: Math.exp(entry.logprob) }))
    .sort((left, right) => right.prob - left.prob)
    .slice(0, 4);

  return (
    <aside className="rail" aria-live="polite">
      <div className="rail__head">
        <span className="rail__index">
          {String(frame.index + 1).padStart(3, "0")}
          <span className="rail__of">
            /
            {total}
          </span>
        </span>
        <code className="rail__token">{visible(frame.text)}</code>
      </div>

      <dl className="facts">
        <div>
          <dt>Gap before</dt>
          <dd>
            {frame.delayMs.toFixed(1)}
            <span className="unit">ms</span>
          </dd>
        </div>
        <div>
          <dt>Probability</dt>
          <dd>{pct(frame.prob)}</dd>
        </div>
        <div>
          <dt>Logprob</dt>
          <dd>{frame.logprob == null ? "—" : frame.logprob.toFixed(3)}</dd>
        </div>
        <div>
          <dt>Margin</dt>
          <dd>{frame.margin == null ? "—" : frame.margin.toFixed(3)}</dd>
        </div>
        <div>
          <dt>Verdict</dt>
          <dd>{BAND_WORD[frame.band]}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>{frame.isPrefill ? "prefill" : "decode"}</dd>
        </div>
      </dl>

      <ul className="flags">
        <li className={stalled ? "flag flag--on flag--stall" : "flag"}>
          <b>S</b>
          stall
        </li>
        <li className={tied ? "flag flag--on flag--tie" : "flag"}>
          <b>T</b>
          contested
        </li>
        <li className={guessed ? "flag flag--on flag--guess" : "flag"}>
          <b>G</b>
          low integrity
        </li>
      </ul>

      <p className="rail__label">
        What it weighed
        <InfoButton label="what it weighed">
          The tokens this step could have produced instead, with the probability
          the model gave each one. These are the candidates the recorder actually
          observed: the engine reports a top handful per step, never the whole
          vocabulary. In the scene they are the nodes ringed around this token.
          The rest of the field is vocabulary at rest — reachable in principle,
          but nothing was measured about it, so nothing is claimed.
        </InfoButton>
      </p>
      {alternatives.length === 0 ? (
        <p className="rail__empty">No alternatives recorded for this token.</p>
      ) : (
        <ol className="wedge">
          {alternatives.map((entry, rank) => (
            <li
              key={`${entry.token}-${rank}`}
              className={rowClass(entry.token, frame.text, candidate)}
            >
              <code>{visible(entry.token)}</code>
              <span className="wedge__bar">
                <i style={{ transform: `scaleX(${Math.max(0.005, entry.prob)})` }} />
              </span>
              <span className="wedge__num">{pct(entry.prob)}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
