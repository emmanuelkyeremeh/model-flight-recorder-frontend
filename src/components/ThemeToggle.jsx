import { THEME } from "../lib/theme.js";

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.75" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M12.6 3.4l-1.06 1.06M4.46 11.54l-1.06 1.06"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M12.4 9.6A5.25 5.25 0 0 1 6.4 3.6 5.5 5.5 0 1 0 12.4 9.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One control, two states. The pressed label is the mode you would switch to,
 * so the sun means "go light" while dark is active.
 */
export function ThemeToggle({ theme, onToggle }) {
  const toLight = theme !== THEME.LIGHT;
  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      aria-label={toLight ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === THEME.LIGHT}
      title={toLight ? "Light mode" : "Dark mode"}
      onClick={onToggle}
    >
      {toLight ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
