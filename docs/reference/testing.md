# Testing

```bash
npm test          # vitest run
npm run test:watch
```

## Setup

`vite.config.js` points Vitest at `jsdom` and
`src/test/canvasStub.js`. The stub gives `HTMLCanvasElement.getContext` enough
of a 2D API that chart draw functions and Three.js construction do not crash
headless. Real WebGL is not required for the unit suite.

## What is covered

| Area | Examples |
| --- | --- |
| Phases | Cold start, download → compile → armed, fault, reset |
| Flight record / analyze | TTFT, ITL percentiles, stalls, contested abs(margin), perplexity |
| Corridor | Altitude encoding, no lateral wander, event selection |
| Camera rig | Drag only while held, release outside canvas, travel vs focus |
| Route layer | Screen-space pick, candidatesAt, setPalette after highlight |
| Scene clock | Delta clamp, resume after pause |
| Theme | resolveTheme, applyDocumentTheme, palettes |
| Receipt | Schema validation, webllm → webgpu mapping |
| App | Empty open, full mock run, analytics tab, nav pad, theme toggle |
| DetailRail | is-chosen / is-picked, info copy about the field |

## Writing a new scene test

Prefer testing the pure or semi-pure module (`corridor`, `cameraRig`,
`routeLayer`) over mounting `FlightScene`. When you need the live scene,
open the app with `?probe=1` and drive `window.__flightProbe` from a manual
check; the unit suite does not assert pixels.
