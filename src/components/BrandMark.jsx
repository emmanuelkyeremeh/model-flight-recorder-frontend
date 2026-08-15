/**
 * The aviation heads-up flight path vector: a circle with two wings and a fin.
 * A pilot reads it as where the aircraft is actually going; everyone else reads
 * a node with synapses. That double meaning is the whole product in one glyph.
 */
function RecorderMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M4.5 22.5 H27.5"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle
        cx="16"
        cy="14.5"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
      />
      <path
        d="M5.5 14.5 H11 M21 14.5 H26.5 M16 10.5 V6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandMark() {
  return (
    <a className="brand" href="/">
      <RecorderMark />
      <span className="brand__name">Model Flight Recorder</span>
    </a>
  );
}
