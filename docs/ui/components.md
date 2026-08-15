# UI components

**Directory:** `src/components/`

Chrome over the scene. Each file is small and prop-driven.

## Shell pieces

| Component | Role |
| --- | --- |
| `TopBar` | Brand, phase lamp + word, Flight/Analytics tabs, theme toggle, Export FDR |
| `ThemeToggle` | Sun/moon button; calls `onToggleTheme` |
| `BrandMark` | SVG flight-path vector + name |
| `PromptDock` | Model select, Download & load, prompt textarea, Run |
| `FlightBrief` | Empty-state copy over the field (vocab size, drawn count, phase detail) |
| `SceneControls` | Bottom-right nav pad: tilt, orbit, level, zoom, recentre. Hold-to-repeat. |

## Flight chrome (only when a run exists)

| Component | Role |
| --- | --- |
| `TokenInspector` | Floating readout; wraps `DetailRail` |
| `DetailRail` | Gap, prob, logprob, margin, verdict, flags, "What it weighed" list |
| `ReadingPanel` | Collapsible transcript (`TokenStream`) |
| `TokenStream` | Clickable tokens with latency bars |
| `Transport` | Follow toggle, scrubber, finding chips, scene legend + info |

`DetailRail` accepts `candidate`. The matching alternative row gets
`is-picked`; the chosen token gets `is-chosen`. An `InfoButton` on "What it
weighed" clarifies that the field is vocabulary at rest and only observed
candidates are labelled.

## Analytics pieces

| Component | Role |
| --- | --- |
| `AnalyticsPanel` | Layout: RunHeader, charts, ContactSheet, Findings, DetailRail |
| `RunHeader` | Headline metrics with InfoButtons |
| `Chart` | Canvas host + expand modal + InfoButton |
| `ContactSheet` | Per-token table |
| `Findings` | Grouped stalls / contested / low-integrity lists |
| `InfoButton` | Accessible `i` that reveals a note |

## InfoButton and Chart expand

`InfoButton` toggles `aria-expanded` and shows an `.info__note`. Notes open
rightward by default; the last two cells/charts in a row flip leftward so they
are not clipped by the viewport edge. On small screens they become bottom
sheets.

`Chart` uses a native `<dialog>` for the modal. The same `draw` callback is
called at a larger size. Escape and the Close button dismiss it.

## SceneControls hold-to-repeat

`useRepeat` starts a timer on pointer down, fires the action on an interval,
and suppresses the click that would otherwise double-fire on release. This is
why holding Zoom feels like a continuous gesture rather than a stutter of
single steps.
