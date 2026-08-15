import { useCallback, useEffect, useState } from "react";
import {
  THEME,
  applyDocumentTheme,
  loadInitialTheme,
  persistTheme,
} from "../lib/theme.js";

/**
 * Owns the light/dark preference. Writing it updates the document attribute
 * immediately so CSS and the WebGL scene can both react in the same frame.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => loadInitialTheme());

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    const resolved = next === THEME.LIGHT ? THEME.LIGHT : THEME.DARK;
    persistTheme(resolved);
    applyDocumentTheme(resolved);
    setThemeState(resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === THEME.LIGHT ? THEME.DARK : THEME.LIGHT);
  }, [setTheme, theme]);

  return { theme, setTheme, toggleTheme };
}
