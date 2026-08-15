# Camera rig

**Source:** `src/lib/scene/cameraRig.js`

One camera, three jobs, no fighting between them.

## State

- `target` / `goalTarget` — the point being studied
- `spherical` / `goalSpherical` — radius, theta, phi offset from the target
- `heldPointer` — pointer id currently dragging, or `null`
- `drift` — idle breathing orbit; any deliberate input stops it

Every frame, current values damp toward goals via `damp()` (see below). A
fly-to during a drag therefore resolves smoothly instead of snapping or
deadlocking.

## Input contract

| Input | Effect |
| --- | --- |
| Left-button / touch drag | Orbit (edits theta/phi). **Only while held.** |
| Wheel | Zoom (edits radius) |
| Right-click | Ignored (context menu) |
| Release outside canvas / blur / lost capture | Ends the drag |

A mouse `pointermove` that reports `buttons === 0` also ends the drag. That
covers the case where the release happened over a floating panel or outside
the window and the canvas never saw `pointerup`.

## Programmatic verbs

```js
lookAt(point, { distance, immediate })
zoomBy(factor)
orbitBy(deltaTheta, deltaPhi)
level()          // recover default attitude, keep subject
rest()           // wide idle framing over the empty field
stopDrift()
```

### Travel vs focus

```js
lookAt(point)                       // glide; keep current distance
lookAt(point, { distance: 16 })     // fly in close
```

`setSelected` in the scene uses the first form when not following (scrub /
transcript). `flyTo` and turning Follow on use the second. Tests in
`cameraRig.test.js` lock this contract under `"travel vs focus"`.

## Idle drift

Two irrational periods so the orbit never visibly repeats:

```js
goalSpherical.theta = π*0.22 + sin(elapsed * 0.043) * 0.28
goalSpherical.phi   = π*0.46 + cos(elapsed * 0.031) * 0.07
```

Stopped by any drag, zoom, orbit, level, or explicit `stopDrift()`. Follow mode
also stops drift so the tracked token does not slide under a breathing camera.

## damp()

**Source:** `src/lib/scene/damp.js`

```js
damp(current, goal, lambda, delta) =
  goal + (current - goal) * Math.exp(-lambda * delta)
```

The familiar `value += (goal - value) * 0.1` converges 2.4× faster on a 144 Hz
display than on 60 Hz. This form depends on elapsed time, so the same scene
feels the same on different monitors. `lambda` is a rate: higher is snappier.
