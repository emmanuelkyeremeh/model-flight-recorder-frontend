import { useEffect, useRef, useState } from "react";
import { InfoButton } from "./InfoButton.jsx";

function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.25 2.75h-3.5v3.5M9.75 2.75h3.5v3.5M6.25 13.25h-3.5v-3.5M9.75 13.25h3.5v-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Paints one canvas at the dimensions its host provides. Kept separate so the
 * same measured plot can render both in the grid and in the inspection dialog.
 */
function ChartCanvas({ height, draw, label }) {
  const canvasRef = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    let frame = 0;
    function paint() {
      const context = canvas.getContext("2d");
      /* Headless environments hand back a partial 2D context. Charts are a
         redundant view of the table and the rail, so skipping the paint costs
         no information. */
      if (typeof context?.save !== "function" || typeof context.setLineDash !== "function") {
        return;
      }
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 320;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawRef.current(context, { width, height });
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    }

    schedule();
    document.fonts?.ready?.then(schedule);

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(canvas);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [draw, height]);

  return (
    <canvas
      ref={canvasRef}
      className="chart__canvas"
      style={{ height: `${height}px` }}
      role="img"
      aria-label={label}
    />
  );
}

/**
 * Canvas chart with two explicit inspection paths: an information button that
 * explains the encoding, and a modal-sized redraw for close reading.
 */
export function Chart({
  title,
  note,
  height = 150,
  draw,
  label,
  description,
}) {
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef(null);
  const accessibleLabel = label ?? title;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (expanded && typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    } else if (!expanded && dialog.open) {
      dialog.close();
    }
  }, [expanded]);

  function close() {
    setExpanded(false);
  }

  return (
    <>
      <figure className="chart">
        <figcaption className="chart__head">
          <span className="chart__title">{title}</span>
          <span className="chart__actions">
            {note ? <span className="chart__note">{note}</span> : null}
            {description ? <InfoButton label={title}>{description}</InfoButton> : null}
            <button
              type="button"
              className="icon-btn"
              aria-label={`Expand ${title}`}
              onClick={() => setExpanded(true)}
            >
              <ExpandIcon />
            </button>
          </span>
        </figcaption>
        <ChartCanvas height={height} draw={draw} label={accessibleLabel} />
      </figure>

      <dialog
        ref={dialogRef}
        className="chart-dialog"
        aria-labelledby={`${title.replaceAll(" ", "-").toLowerCase()}-title`}
        aria-hidden={expanded ? undefined : true}
        onClose={close}
        onCancel={close}
      >
        <div className="chart-dialog__head">
          <div>
            <h2 id={`${title.replaceAll(" ", "-").toLowerCase()}-title`}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="btn btn--quiet" onClick={close}>
            Close
          </button>
        </div>
        <ChartCanvas height={420} draw={draw} label={accessibleLabel} />
      </dialog>
    </>
  );
}
