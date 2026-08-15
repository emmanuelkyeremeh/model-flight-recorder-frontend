# createFlightScene

**Source:** `src/lib/scene/flightScene.js`

The orchestrator. If you only read one scene file, read this one.

## Construction order

1. WebGL renderer (antialias, high-performance, optional preserveDrawingBuffer)
2. Scene + exponential fog
3. Perspective camera (52°, near 0.5, far 1400)
4. Vocabulary field sized by `fieldBudget()` (22k or 60k by device)
5. Route layer, grid, reticle
6. Camera rig bound to the canvas
7. Label layer (36 HTML spans)
8. Custom scene clock (replaces deprecated `THREE.Clock`)
9. ResizeObserver, visibility listener, pointer handlers
10. Start the rAF loop; install `__flightProbe` if requested

## Frame loop

```js
function frame(delta, elapsed) {
  if (follow && head) { rig.stopDrift(); rig.lookAt(head.position); }
  rig.update(...);
  field.update(...);
  grid.update(camera.position.z);
  reticle.update(...);
  updateLabels();
  updateHover();
  renderer.render(scene, camera);
}
```

`loop` requests the next frame and calls `clock.tick(MAX_FRAME_DELTA)` where
`MAX_FRAME_DELTA = 0.05`. A stalled tab must not teleport the drift or the
camera. `visibilitychange` parks the loop and calls `clock.resume()` on return
so the gap is discarded.

## createSceneClock

```text
tick(maxDelta) -> { delta, elapsed }
resume()          // discard the parked gap
```

Elapsed advances only by deltas actually spent rendering. There is a unit test
for clamping and for resume-after-pause.

## Selection paths

| Caller | Scene method | Camera |
| --- | --- | --- |
| Scrub / transcript (`select` in App) | `setSelected` | Glide, keep distance |
| Node click (`pickInScene`) | `flyTo` | Close focus |
| Finding chip / Follow on | `flyTo` / `setFollow(true)` | Close focus |
| Recentre with no run | `rest` | Wide idle |

Pointer up only counts as a pick if the pointer moved less than 4 px since
down; otherwise the user was orbiting.

## Hover cursor

Once per frame, from the last known pointer position: if a node is under the
cursor and the rig is not dragging, the canvas gets `is-hot` and CSS shows a
pointer cursor.

## Theme

`applyTheme` reads `scenePalette(theme)` and pushes colours into the renderer
clear, fog, field, route, reticle, and grid. Called at construction and from
`setTheme`.

## Disposal

Cancels rAF, removes listeners, disposes rig/labels/field/route/grid/reticle,
disposes the renderer, force-loses the context, removes the canvas. Order
matters: lose the context last so dispose calls still work.
