# Scene overview

**Directory:** `src/lib/scene/`

The scene is the application. Everything else is chrome over it.

## Files

| File | Role |
| --- | --- |
| `flightScene.js` | Orchestrator: renderer, loop, public API, labels, probe |
| `vocabularyField.js` | Sea of neurons (one `Points` draw call) |
| `routeLayer.js` | Instanced waypoints, segments, alternates, halos, picking |
| `cameraRig.js` | Spherical camera with damped goals |
| `instruments.js` | Reticle + ground grid |
| `damp.js` | Frame-rate-independent exponential damping |

## Lifecycle

```
FlightScene.jsx mounts once
   │
   ▼
createFlightScene({ container, onSelect, vocabTokens, theme })
   │  builds renderer, field, route, grid, reticle, rig, labels, clock
   │  starts requestAnimationFrame loop
   ▼
React effects forward props as method calls:
   setCorridor / setSelected / setFollow / setReveal / setBusy / setTheme / setVocabulary
   │
   ▼
on unmount: dispose() tears everything down and force-loses the GL context
```

`FlightScene.jsx` deliberately mounts the scene in an effect with `[]` deps.
Changing the model calls `setVocabulary`, not a remount. That is what stopped
the blink between phases.

## Public API (what App calls through sceneRef)

```js
setCorridor(corridor)
setSelected(index)       // glide if !follow
setFollow(boolean)       // turning on reframes at FOLLOW_DISTANCE
flyTo(index, { distance })
zoomIn() / zoomOut()
orbit(deltaTheta, deltaPhi)
level()
rest()                   // wide idle framing
setReveal(0..1)
setBusy(boolean)
setTheme("dark"|"light")
setVocabulary(tokenCount)
drawnTokens              // getter
resize()
dispose()
```

## Adaptive quality

`setBusy(true)` during transfer or recording:

- pixel ratio clamped to 1.0
- field drift scaled to 0.2

Restored when idle. This exists because WebLLM and WebGL share unified memory
on Apple Silicon; letting both run at full fill-rate on a 16 GB laptop produces
jank and, in the worst case, an OOM on the stress models.

## Probe mode

`?probe=1` sets `preserveDrawingBuffer: true` and installs
`window.__flightProbe`. See {doc}`../intro/run-locally`.
