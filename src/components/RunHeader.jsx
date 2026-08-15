import { downloadText } from "../lib/download.js";
import { receiptToJson } from "../lib/receipt.js";
import { InfoButton } from "./InfoButton.jsx";

function num(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

/**
 * Five labelled readings — not a wall of cells. Everything else lives in the
 * table and the detail rail.
 */
export function RunHeader({
  analysis,
  model,
  runtime,
  receipt,
  phaseLabelText,
  showMetrics = true,
}) {
  const cells = [
    {
      label: "TTFT",
      value: num(analysis?.ttftMs, 1),
      unit: "ms",
      description: "Time from submitting the prompt until the first generated token. It includes prompt processing, so it is the wait before the model begins speaking.",
    },
    {
      label: "Decode",
      value: num(analysis?.tokPerS, 1),
      unit: "tok/s",
      description: "Average tokens generated per second after the first token. Higher is faster, but it does not describe uneven pauses between individual tokens.",
    },
    {
      label: "ITL p50",
      value: num(analysis?.itlMsP50, 1),
      unit: "ms",
      description: "Median inter-token latency. Half of decoded tokens arrived with a shorter gap and half with a longer gap.",
    },
    {
      label: "ITL p95",
      value: num(analysis?.itlMsP95, 1),
      unit: "ms",
      description: "The gap that 95% of decoded tokens stayed below. It exposes the slow tail that an average can hide.",
    },
    {
      label: "Perplexity",
      value: num(analysis?.perplexity, 2),
      unit: "",
      description: "The effective number of plausible choices per step, derived from recorded log probabilities. Lower means more decisive, not more truthful.",
    },
  ];

  const weightsId = model?.id ?? receipt?.model_id ?? null;

  return (
    <header className="runhead">
      <div className="runhead__id">
        <span className="runhead__model">{model?.label ?? receipt?.model_id ?? "—"}</span>
        {weightsId ? <span className="ident runhead__weights">{weightsId}</span> : null}
        <span className="runhead__meta">{runtime}</span>
        <span className="runhead__meta">{phaseLabelText}</span>
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
      {showMetrics ? (
        <dl className="runhead__cells">
          {cells.map((cell) => (
            <div key={cell.label} className="cell">
                <dt className="cell__label">
                  {cell.label}
                  <InfoButton label={cell.label}>{cell.description}</InfoButton>
                </dt>
              <dd className="cell__value">
                {cell.value}
                {cell.unit ? <span className="cell__unit">{cell.unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}
