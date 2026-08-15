# App.jsx

**Source:** `src/App.jsx`

The orchestrator for React chrome. It does not draw the scene; it owns the
state the scene and the panels share.

## State

| State | Role |
| --- | --- |
| `view` | `"flight"` or `"analytics"` |
| `selected` | Frame index under inspection |
| `candidate` | Token string of a clicked alternative, or `null` |
| `follow` | Camera rides the newest / selected token |
| `sceneRef` | Imperative handle to `createFlightScene`'s API |
| `theme` | From `useTheme` |

Derived: `corridor` (`buildCorridor`), `events` (`corridorEvents`, only when
`COMPLETE`), `frame` (the selected analysis frame), `recording` / `loading`.

## Selection helpers

```js
select(index, candidate)       // scrub / transcript: glide, no flyTo
pickInScene(index, candidate)  // node click: flyTo
flyTo(index)                   // chips / recentre: flyTo, clear candidate
```

Follow is turned off by any of these. While `recording && follow`, an effect
keeps `selected` on the newest frame so the camera rides the live head.

## revealFor(phase)

| Phase | Reveal |
| --- | --- |
| COLD / FAULT | 0.5 |
| FUELING / COMPILING | `0.5 + 0.5 * progress` |
| anything else | 1.0 |

Downloading a model is something you watch happen in the field, not only a
percent on a button.

## Layout by view

**Flight** (always mounts `FlightScene` underneath):

- With a run: `TokenInspector`, `ReadingPanel`, `Transport`
- Without a run: `FlightBrief`
- Always: `SceneControls`, `PromptDock`

**Analytics:** `AnalyticsPanel` (scene stays mounted behind it; WebGL context
is not torn down).

`TopBar` is always visible.
