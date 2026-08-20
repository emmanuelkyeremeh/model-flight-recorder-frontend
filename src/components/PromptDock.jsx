import { MODEL_CATALOG, formatModelOption } from "../lib/catalog.js";
import { PHASE } from "../lib/phases.js";
import { formatCoresLabel, formatGpuLabel, formatRamLabel } from "../lib/webgpu.js";

/**
 * The dock floats over the scene the way a map's search bar does: it is the
 * only thing you must touch, and it never becomes the subject of the screen.
 * The hardware strip above it is advisory — browser estimates, not VRAM.
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
  loadedModelId = null,
  device = null,
}) {
  const cached = loadedModelId === model.id
    && (phaseName === PHASE.ARMED || phaseName === PHASE.COMPLETE);
  const downloading = phaseName === PHASE.FUELING || phaseName === PHASE.COMPILING;
  const gpuLabel = formatGpuLabel(device);
  const ramLabel = formatRamLabel(device);
  const coresLabel = formatCoresLabel(device);
  const deviceTitle = [
    device?.available === false ? device.reason : null,
    device?.memoryGb == null
      ? "Exact RAM is not exposed; browsers only share a coarse estimate when available."
      : "RAM is a browser estimate (Device Memory API), not exact system memory. VRAM is never exposed.",
  ].filter(Boolean).join(" ");

  return (
    <div className="dock-stack">
      <p className="dock-device" title={deviceTitle} aria-live="polite">
        <span className="dock-device__item">
          <span className="dock-device__key">GPU</span>
          {" "}
          <span className="dock-device__value">{gpuLabel}</span>
        </span>
        <span className="dock-device__sep" aria-hidden="true">·</span>
        <span className="dock-device__item">
          <span className="dock-device__key">RAM</span>
          {" "}
          <span className="dock-device__value">{ramLabel}</span>
        </span>
        {coresLabel ? (
          <>
            <span className="dock-device__sep" aria-hidden="true">·</span>
            <span className="dock-device__item">
              <span className="dock-device__key">CPU</span>
              {" "}
              <span className="dock-device__value">{coresLabel}</span>
            </span>
          </>
        ) : null}
      </p>

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
                {formatModelOption(entry)}
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
    </div>
  );
}
