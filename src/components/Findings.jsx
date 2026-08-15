const MAX_ROWS = 6;

function visible(text) {
  if (text.trim() === "") {
    return "␣";
  }
  return text.length > 12 ? `${text.slice(0, 12)}…` : text;
}

function Group({ mark, title, rule, frames, format, onSelect }) {
  const shown = frames.slice(0, MAX_ROWS);

  return (
    <section className="finding">
      <h3 className="finding__head">
        <b className={`mark mark--${mark}`}>{mark.toUpperCase()}</b>
        {title}
        <span className="finding__count">{frames.length}</span>
      </h3>
      <p className="finding__rule">{rule}</p>
      {frames.length === 0 ? (
        <p className="finding__none">None in this run.</p>
      ) : (
        <ul className="finding__rows">
          {shown.map((frame) => (
            <li key={frame.index}>
              <button type="button" onClick={() => onSelect(frame.index)}>
                <span className="finding__idx">{String(frame.index + 1).padStart(3, "0")}</span>
                <code>{visible(frame.text)}</code>
                <span className="finding__val">{format(frame)}</span>
              </button>
            </li>
          ))}
          {frames.length > shown.length ? (
            <li className="finding__more">
              {frames.length - shown.length}
              {" more in the table"}
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

/** Anomalies stay on screen with their headers even at zero, so the absence of
    a finding is itself a reading rather than a missing panel. */
export function Findings({ analysis, onSelect }) {
  return (
    <div className="findings">
      <Group
        mark="s"
        title="Stalls"
        rule="Gap over 2.5× the median."
        frames={analysis?.stalls ?? []}
        format={(frame) => `${frame.delayMs.toFixed(0)}ms`}
        onSelect={onSelect}
      />
      <Group
        mark="t"
        title="Contested"
        rule="Another token nearly won."
        frames={analysis?.coinFlips ?? []}
        format={(frame) => (frame.margin == null ? "—" : frame.margin.toFixed(2))}
        onSelect={onSelect}
      />
      <Group
        mark="g"
        title="Low integrity"
        rule="Winner carried under 15% probability."
        frames={analysis?.guesses ?? []}
        format={(frame) => `${((frame.prob ?? 0) * 100).toFixed(1)}%`}
        onSelect={onSelect}
      />
    </div>
  );
}
