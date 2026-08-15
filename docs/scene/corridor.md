# Corridor

**Source:** `src/lib/corridor.js`

Pure spatial model. No Three.js. The GPU layer consumes its output.

## buildCorridor(frames, { cadenceMs })

Walks frames in order and emits:

```js
{
  waypoints: [{
    frameIndex, token, label, prob, band, delayMs, isPrefill,
    position: { x, y, z },
    halo,
    candidates,          // chosen + reported alternatives, sorted by prob
  }],
  alternates: [{
    frameIndex, token, label, prob,
    position: { x, y, z },   // on a ring around the waypoint
  }],
  length,                // total forward distance flown
}
```

### Axis meanings

```
z  = -cumulative forwardStep(delayMs, cadenceMs)
     forwardStep = clamp(1.6 + log1p(delay/cadence)*2.6, 1.6, 9)

y  = ((prob ?? 0.5) - 0.5) * 8
     // dead centre when the model reported nothing

x  = 0 for waypoints
     cos(angle)*radius for alternates
```

`cadenceMs` defaults to 20 and is normally the run's ITL p50, so a "typical"
gap advances the route by a comfortable step and a stall stretches it.

### Candidate rings

Up to four losers per step. Angle uses the golden angle
(`rank * 2.399963 + waypoints.length * 0.618`) so rings do not line up down the
corridor. Radius grows with `1 - candidate.prob`.

```js
radius = RING_MIN + clamp(1 - prob, 0, 1) * (RING_MAX - RING_MIN)
```

### readableToken

Whitespace and control characters become visible glyphs (`␣`, `\n`, `\t`) so
labels and finding chips stay readable.

## corridorEvents(analysis, corridor)

Returns the four story beats, each with a `waypoint` reference the transport
can fly to:

1. **Before it said anything** — first frame (prefill wait)
2. **Longest hesitation** — max `delayMs` among decode frames
3. **Closest call** — min `abs(margin)` with a runner-up
4. **Least certain word** — min `prob`

Events whose waypoint is missing are filtered out. Chips only appear when the
phase is `COMPLETE` (see `App.jsx`).

## Why this is separate from the GPU layer

The corridor can be unit-tested without WebGL. The GPU layer can swap
implementations without changing the mapping. Live updates call
`buildCorridor` on every token and let `routeLayer.sync` diff the result
rather than reallocating buffers.
