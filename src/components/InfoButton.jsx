import { useId, useState } from "react";

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 7.25v4M8 4.6v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * An explicit explanation control, not a hover-only tooltip. The note remains
 * in the document flow, works with touch and keyboard, and closes with Escape.
 */
export function InfoButton({ label, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="info">
      <button
        type="button"
        className="icon-btn"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <InfoIcon />
      </button>
      {open ? (
        <span id={id} className="info__note" role="note">
          {children}
        </span>
      ) : null}
    </span>
  );
}
