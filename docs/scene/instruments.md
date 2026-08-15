# Instruments

**Source:** `src/lib/scene/instruments.js`

Cockpit furniture: the reticle that marks the token under inspection, and a
ground grid that gives the corridor a floor.

## Reticle

Hairline geometry that is also the app's logo: circle, two wings, one fin.

```js
createReticle({ color })
  .moveTo(position)     // arms and shows; first call snaps
  .hide()
  .update(delta, camera, elapsed)  // damps toward goal, billboards to camera
  .setColor(next)
```

A slow breath (`1.5 + sin(elapsed * 2.1) * 0.06`) keeps the marker findable
without animating the data. `depthTest = false`, `renderOrder = 10` so it
stays visible through the field.

## Grid

```js
createGrid({ color, y })
  .update(cameraZ)      // snaps in whole cells so lines never crawl
  .setOpacity(value)
  .setColor(next)
```

Drawn as line segments across a fixed depth. `update` sets
`position.z = ceil(cameraZ / spacing) * spacing`, so the grid reads as
continuous terrain rather than a finite tile you can fly off the edge of.

Both instruments expose `setColor` so theme swaps retint them without
rebuilds.
