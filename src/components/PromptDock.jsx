import { MODEL_CATALOG } from "../lib/catalog.js";
import { PHASE } from "../lib/phases.js";

/**
 * The dock floats over the scene the way a map's search bar does: it is the
 * only thing you must touch, and it never becomes the subject of the screen.
 */
export function PromptDock({
  model,
  prompt,
  onPromptChange,
  onSelect,
  onArm,
  onRun,
  canArm,
  canRun,
  recording,
  loading,
  phaseName,
  loadPercent,
}) {
  const cached = phaseName === PHASE.ARMED || phaseName === PHASE.COMPLETE;
  const downloading = phaseName === PHASE.FUELING || phaseName === PHASE.COMPILING;

  return (
    <section className="dock" aria-label="Run setup">
      <label className="dock__model">
        <span className="sr-only">Subject model</span>
        <select
          value={model.id}
          disabled={loading || recording}
          onChange={(event) => onSelect(event.target.value)}
          aria-label="Subject model"
        >
          {MODEL_CATALOG.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
              {" · "}
              {entry.downloadMb}
              MB
            </option>
          ))}
        </select>
      </label>

      {cached ? null : (
        <button
          type="button"
          className={downloading ? "btn btn--quiet is-loading" : "btn btn--quiet"}
          onClick={onArm}
          disabled={!canArm || loading || recording}
        >
          {downloading ? `${loadPercent ?? 0}%` : "Download & load"}
        </button>
      )}

      <input
        className="dock__prompt"
        type="text"
        value={prompt}
        disabled={recording}
        placeholder="Ask the model something…"
        aria-label="Prompt"
        spellCheck="true"
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && canRun && !recording) {
            event.preventDefault();
            onRun();
          }
        }}
      />

      <button
        type="button"
        className="btn btn--primary"
        onClick={onRun}
        disabled={!canRun || recording}
      >
        {recording ? "Recording…" : "Run"}
      </button>
    </section>
  );
}
