# Model Flight Recorder

**Version 0.1.0**

A browser-local flight recorder for small language models. You run a tiny
instruct model on your own GPU through WebLLM, and the app draws the generation
as a route through the model's vocabulary.

This site explains the code in enough detail that you can read a module, know
what it owns, and know what calls it. It is written for the author of the app
first: if a file still feels opaque after reading its page here, the page is
incomplete.

```{image} images/01-brief-dark.png
:alt: Opening brief over the vocabulary field
:width: 100%
```

*Opening state. The field already holds one point per token in SmolLM2's
vocabulary. Nothing has been invented yet.*

## Start here

```{toctree}
:maxdepth: 2
:caption: Getting oriented

intro/what-it-is
intro/mental-model
intro/run-locally
intro/screenshots
```

```{toctree}
:maxdepth: 2
:caption: How a run happens

runtime/phases
runtime/recorder
runtime/engines
runtime/flight-record
runtime/analyze
runtime/receipt
```

```{toctree}
:maxdepth: 2
:caption: The 3D scene

scene/overview
scene/corridor
scene/vocabulary-field
scene/route-layer
scene/camera-rig
scene/instruments
scene/flight-scene
scene/labels-and-picking
```

```{toctree}
:maxdepth: 2
:caption: The chrome around the scene

ui/app
ui/components
ui/analytics
ui/theme
```

```{toctree}
:maxdepth: 2
:caption: Reference

reference/catalog
reference/telemetry
reference/file-map
reference/testing
reference/backend
```

## One-sentence summary of every layer

| Layer | Owns |
| --- | --- |
| `useRecorder` | Arming the engine, running a prompt, the phase machine, the live `FlightRecord` |
| `analyzeFlight` | Per-token frames, stalls, contested picks, low-integrity picks, perplexity |
| `buildCorridor` | Pure spatial model: waypoints + alternates with meaningful axes |
| `createFlightScene` | One persistent WebGL context for the whole session |
| `vocabularyField` | One point per vocab token, GPU-side drift and wrapping |
| `routeLayer` | Instanced route + candidates, screen-space picking |
| `cameraRig` | Drag / zoom / fly-to / follow, all damped |
| Chrome components | HUD over the scene: dock, transport, inspector, analytics |

## Honesty rules the code enforces

1. **Consent before cost.** Weights download only after `Download & load`.
2. **First-party evidence only.** Empty stays empty. No sample run fills the UI.
3. **Observed candidates only.** Ringed nodes are tokens WebLLM reported. The field is vocabulary at rest, not invented probabilities.
4. **Metrics-only receipts.** The export never carries the prompt or the completion text.
5. **One WebGL context.** The scene is never torn down between phases.

If a change breaks one of these, it is a product bug, not a style preference.
