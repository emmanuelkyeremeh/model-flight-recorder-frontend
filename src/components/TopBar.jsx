import { BrandMark } from "./BrandMark.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { downloadText } from "../lib/download.js";
import { phaseLabel } from "../lib/phases.js";
import { receiptToJson } from "../lib/receipt.js";

/**
 * The only chrome pinned above the scene. It carries identity, the one word
 * describing what the machine is doing, and the way out to the numbers.
 */
export function TopBar({
  phase,
  recording,
  view,
  onView,
  receipt,
  hasRun,
  theme,
  onToggleTheme,
}) {
  return (
    <header className="hud hud--top">
      <div className="hud__group">
        <BrandMark />
        <span className={recording ? "lamp lamp--live" : "lamp"} aria-hidden="true" />
        <span className="hud__phase">{phaseLabel(phase.name)}</span>
      </div>

      <div className="hud__group">
        <div className="segmented" role="tablist" aria-label="View">
          <button
            type="button"
            role="tab"
            aria-selected={view === "flight"}
            className={view === "flight" ? "is-active" : ""}
            onClick={() => onView("flight")}
          >
            Flight
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "analytics"}
            className={view === "analytics" ? "is-active" : ""}
            disabled={!hasRun}
            onClick={() => onView("analytics")}
          >
            Analytics
          </button>
        </div>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        {receipt ? (
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => downloadText(
              `mfr-${receipt.run_id}.json`,
              receiptToJson(receipt),
              "application/json",
            )}
          >
            Export FDR
          </button>
        ) : null}
      </div>
    </header>
  );
}
