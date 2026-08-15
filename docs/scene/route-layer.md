# Route layer

**Source:** `src/lib/scene/routeLayer.js`

The recorded route: sampled tokens, rejected candidates, uncertainty halos.

## Preallocated instances

| Mesh | Capacity | Geometry |
| --- | --- | --- |
| `routeMesh` | 512 | open cylinder (segment between waypoints) |
| `waypointMesh` | 512 | octahedron |
| `alternateMesh` | 512 × 4 | octahedron |
| `spokeMesh` | 512 × 4 | thin cylinder (waypoint → candidate) |
| `haloPoints` | 512 | custom soft-glow points |

All use `DynamicDrawUsage`. A token arriving mid-run writes matrices and
colours; `count` / draw range advance. Nothing is rebuilt.

## Colour

```js
colorFor(point) = lerp(uncertainColor, confidentColor, clamp(prob, 0, 1))
```

Cyan when sure, yellow when guessing. Selection paints the active waypoint
near-white (`accent`). Candidates at the selected step brighten and grow;
others stay dim without disappearing.

## sync(corridor)

```js
const from = next > drawn ? drawn : 0;   // append if growing, rewrite if new run
writeWaypoints(corridor, from, next);
writeAlternates(corridor, next);         // packed rewrite (variable candidates/step)
```

`packed` stores alternates in instance order so a later pick or highlight can
map an instance index back to `{ frameIndex, token, position, anchor }`.

## highlight(frameIndex)

Hoisted as a function declaration inside the closure (not only as a method), so
`setPalette` can call it after a theme swap without a `ReferenceError`. That
bug bit light-mode toggling once; there is a regression test for it.

## Screen-space picking

```js
pick({ camera, x, y, width, height, radius = 20 })
```

Projects every drawn waypoint and packed alternate to screen space. Nearest
within `radius` wins. Sampled tokens get a 6 px bonus so the route node wins
ties against the candidates ringed around it. Returns
`{ frameIndex, token, kind: "sampled"|"candidate" }` or `null`.

Raycasting was tried and rejected: these nodes are a fraction of a unit across,
and a viewer aims at the visible dot, not a mathematical centre.

## candidatesAt(frameIndex)

Filters `packed` for the selected step. `flightScene` uses this to build
candidate labels with probabilities.
