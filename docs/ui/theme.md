# Theme

**Sources:** `src/lib/theme.js`, `src/hooks/useTheme.js`, `src/index.css`,
inline boot in `index.html`

## Boot (no FOUC)

`index.html` runs a tiny inline script before paint:

1. Read `localStorage["mfr-theme"]`
2. Else prefer `prefers-color-scheme`
3. Set `document.documentElement.dataset.theme` and `style.colorScheme`

React then hydrates into an already-correct theme.

## useTheme

```js
const { theme, toggleTheme } = useTheme();
```

Toggles dark ↔ light, persists, calls `applyDocumentTheme`.

## What has to change besides CSS

CSS variables cover the chrome. Three things cannot live in stylesheets:

1. **WebGL clear, fog, field, route, reticle, grid** → `SCENE_PALETTE`
2. **Canvas chart ink** → `CHART_PALETTE`
3. **Field blending mode** → additive in dark, normal in light

`FlightScene.setTheme` and `setChartTheme` consume those palettes.

## CSS tokens worth knowing

| Token | Role |
| --- | --- |
| `--bg-page`, `--bg-panel`, `--bg-elevated` | Surfaces |
| `--text-primary`, `--text-secondary`, `--text-tertiary` | Type (tertiary meets AA in light) |
| `--text-halo`, `--halo-scene` | Halo behind type over the 3D scene |
| `--shadow-pop`, `--shadow-modal` | Elevated shadows per theme |
| `--label-ink*`, `--label-border*` | Scene label colours |
| `--pick-tint`, `--pick-ring` | Picked alternative row |
| `--bar-track`, `--bar-fill`, `--heat-fill` | Meter fills |

Hardcoded colours outside the token blocks are a bug. The light-mode pass
replaced several in `.chart-dialog`, `.info__note`, and button hovers.
