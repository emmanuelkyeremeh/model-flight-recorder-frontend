/**
 * Theme is a document attribute (`data-theme`) plus a small palette the WebGL
 * scene and canvas charts can read. CSS owns the chrome; this module owns the
 * values that cannot live in stylesheets.
 */

export const THEME = Object.freeze({
  DARK: "dark",
  LIGHT: "light",
});

const STORAGE_KEY = "mfr-theme";

/** Scene + chart ink that has to change with the page, not just the CSS chrome. */
export const SCENE_PALETTE = Object.freeze({
  [THEME.DARK]: Object.freeze({
    clear: 0x000000,
    fog: 0x000000,
    fogDensity: 0.0042,
    fieldDeep: 0x1d6f91,
    fieldCool: 0x86d8f5,
    fieldCommit: 0xdbe978,
    fieldAdditive: true,
    routeInk: 0x86d8f5,
    routeUncertain: 0xdbe978,
    routeDim: 0x346f89,
    routeAccent: 0xeffbff,
    reticle: 0x52a8ff,
    grid: 0xffffff,
    gridOpacity: 0.08,
  }),
  [THEME.LIGHT]: Object.freeze({
    /* Soft paper, not pure white — pure white washes the cyan route out. */
    clear: 0xf2f4f7,
    fog: 0xf2f4f7,
    fogDensity: 0.0034,
    /* Darker, denser field so additive-less points still read as a sea. */
    fieldDeep: 0x1a5f7a,
    fieldCool: 0x2f8fb0,
    fieldCommit: 0xa89020,
    fieldAdditive: false,
    routeInk: 0x0e7490,
    routeUncertain: 0xa16207,
    routeDim: 0x5b7c8a,
    routeAccent: 0x0f172a,
    reticle: 0x2563eb,
    grid: 0x0f172a,
    gridOpacity: 0.12,
  }),
});

export const CHART_PALETTE = Object.freeze({
  [THEME.DARK]: Object.freeze({
    ink: "#ededed",
    dim: "#888888",
    grid: "rgba(255, 255, 255, 0.06)",
    series: "#8bd5f5",
    seriesDeep: "rgba(89, 170, 207, 0.42)",
    commit: "#dbe978",
    stall: "#ff6666",
    tie: "#52a8ff",
    crosshair: "rgba(255, 255, 255, 0.28)",
    refSoft: "rgba(255,255,255,0.45)",
    runnerUp: "rgba(82,168,255,0.45)",
  }),
  [THEME.LIGHT]: Object.freeze({
    ink: "#171717",
    dim: "#737373",
    grid: "rgba(15, 23, 42, 0.08)",
    series: "#0e7490",
    seriesDeep: "rgba(14, 116, 144, 0.38)",
    commit: "#a16207",
    stall: "#dc2626",
    tie: "#2563eb",
    crosshair: "rgba(15, 23, 42, 0.35)",
    refSoft: "rgba(15, 23, 42, 0.4)",
    runnerUp: "rgba(37, 99, 235, 0.35)",
  }),
});

export function systemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return THEME.DARK;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? THEME.LIGHT
    : THEME.DARK;
}

export function readStoredTheme() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === THEME.LIGHT || stored === THEME.DARK) {
      return stored;
    }
  } catch {
    /* Private mode / blocked storage: fall through to system. */
  }
  return null;
}

export function resolveTheme(preference = "system") {
  if (preference === THEME.LIGHT || preference === THEME.DARK) {
    return preference;
  }
  return systemTheme();
}

export function applyDocumentTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }
  const next = theme === THEME.LIGHT ? THEME.LIGHT : THEME.DARK;
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
}

export function persistTheme(theme) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Ignore: theming still works for the session. */
  }
}

export function loadInitialTheme() {
  const stored = readStoredTheme();
  const theme = stored ?? systemTheme();
  applyDocumentTheme(theme);
  return theme;
}

export function scenePalette(theme) {
  return SCENE_PALETTE[theme] ?? SCENE_PALETTE[THEME.DARK];
}

export function chartPalette(theme) {
  return CHART_PALETTE[theme] ?? CHART_PALETTE[THEME.DARK];
}

export function readDocumentTheme() {
  if (typeof document === "undefined") {
    return THEME.DARK;
  }
  const attr = document.documentElement.dataset.theme;
  return attr === THEME.LIGHT ? THEME.LIGHT : THEME.DARK;
}
