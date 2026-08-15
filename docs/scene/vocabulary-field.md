# Vocabulary field

**Source:** `src/lib/scene/vocabularyField.js`

The sea of neurons. One point per token in the model's vocabulary (capped by a
device budget). One draw call.

## Construction

```js
createVocabularyField({ count, deep, cool, commit })
```

- Positions: disc around the corridor, square-root radial sampling so density
  stays even (uniform random would crowd the centre line the route has to stay
  readable in).
- Seeds + scales: deterministic PRNG from a fixed seed so the same model always
  renders the same sky.
- Bounding sphere set to Infinity; the shader relocates every point, so an
  automatic sphere would cull the field the moment the camera left the original
  volume.
- `frustumCulled = false`, `renderOrder = -1`.

## Vertex shader jobs

1. **Wrap depth** into a window that travels with the camera, so a fixed budget
   of points yields unlimited corridor depth.
2. **Drift** on the GPU (`sin`/`cos` of time + seed), scaled by `uDrift`.
3. **Size clamp** — near points would otherwise blow out under additive blending.
4. **Near/far fade** via `smoothstep` (low edge first; GLSL leaves the function
   undefined when `edge0 >= edge1`).
5. **Pulse** when a token commits (`strike()` sets `pulse = 1`).

## Fragment shader

Soft disc, colour mixed from `uColorDeep` → `uColorCool` by seed, then toward
`uColorCommit` by pulse energy.

## Public methods

```js
setVisibleCount(n)     // draw range, not a reallocation
setPixelRatio(ratio)
setDrift(scale)        // 1 normal, 0.2 when busy
setPalette({ deep, cool, commit, additive })
strike()               // flash on commit
update(delta, elapsed, { cameraZ, headZ, reveal })
dispose()
```

## Reveal

`uReveal` fades the field in. First frame snaps (a throttled tab may only ever
grant one frame; that frame has to be the finished picture). Later frames damp
toward the target. `App` drives the target from the phase:
half-lit while cold/faulting, rising with download progress, full once armed.

## Light mode

Additive sprites on a pale clear colour wash out. `setPalette` switches to
`NormalBlending` and darker field colours so the sea still reads as a sea on
paper.
