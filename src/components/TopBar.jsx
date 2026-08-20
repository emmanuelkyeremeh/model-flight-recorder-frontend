import { BrandMark } from "./BrandMark.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { downloadText } from "../lib/download.js";
import { isTransferPhase, phaseLabel } from "../lib/phases.js";
import { receiptToJson } from "../lib/receipt.js";

/**
 * The only chrome pinned above the scene. It carries identity, the one word
 * describing what the machine is doing, transfer progress while weights arrive,
 * and the way out to the numbers.
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
  const transferring = isTransferPhase(phase.name);
  const transfer = phase.transfer;
  const transferText = transfer?.text || phase.detail || "";
  const percent = transfer?.percent ?? Math.round((phase.progress ?? 0) * 100);

  return (
    <header className="hud hud--top">
      <div className="hud__group hud__group--status">
        <BrandMark />
        <span className={recording ? "lamp lamp--live" : "lamp"} aria-hidden="true" />
        <div className="hud__status">
          <span className="hud__phase">{phaseLabel(phase.name)}</span>
          {transferring ? (
            <div
              className="hud__transfer"
              title={transferText}
              aria-live="polite"
            >
              <span className="hud__transfer-text">{transferText}</span>
              <div
                className="hud__transfer-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label="Model download progress"
              >
                <div
                  className="hud__transfer-fill"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
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
