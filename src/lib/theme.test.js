import { afterEach, describe, expect, it } from "vitest";
import {
  THEME,
  applyDocumentTheme,
  chartPalette,
  resolveTheme,
  scenePalette,
} from "./theme.js";

afterEach(() => {
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = "";
});

describe("theme", () => {
  it("resolves an explicit preference without consulting the system", () => {
    expect(resolveTheme(THEME.LIGHT)).toBe(THEME.LIGHT);
    expect(resolveTheme(THEME.DARK)).toBe(THEME.DARK);
  });

  it("writes the theme onto the document for CSS to read", () => {
    applyDocumentTheme(THEME.LIGHT);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("gives the scene a pale clear colour in light mode and black in dark", () => {
    expect(scenePalette(THEME.DARK).clear).toBe(0x000000);
    expect(scenePalette(THEME.LIGHT).clear).not.toBe(0x000000);
    expect(scenePalette(THEME.LIGHT).fieldAdditive).toBe(false);
    expect(scenePalette(THEME.DARK).fieldAdditive).toBe(true);
  });

  it("gives charts darker ink on paper", () => {
    expect(chartPalette(THEME.LIGHT).ink).toBe("#171717");
    expect(chartPalette(THEME.DARK).ink).toBe("#ededed");
  });
});
