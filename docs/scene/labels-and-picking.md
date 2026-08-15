# Labels and picking

## Why labels are not React

Labels move every frame. Putting them in React state would reconcile a tree of
spans sixty times a second for text that only translates a few pixels.
`createLabelLayer` builds 36 spans once; the render loop writes
`textContent`, `transform`, `opacity`, and modifier classes directly.

## sampledLabels()

Every waypoint within 78 world units of the camera, plus the selected one
regardless of distance. Rank: selected = 0, others = `2 + distance/1000`.

## candidateLabels()

`route.candidatesAt(selected)`, each with:

- `awayFrom` = the waypoint it orbits (used to nudge the label clear)
- text including probability when known (`training  36.7%`)
- kind `"candidate"`, rank 1

## Declutter

Entries sorted by rank, capped at 36. For each:

1. Project to screen. Skip if behind the camera (`projected.z > 1`).
2. If `awayFrom` is set, push further along the vector from the anchor.
3. Try placements. Sampled labels hang above-right on a stem. Candidate labels
   sit on their node and may shuffle through
   `CANDIDATE_PLACEMENTS` (`[0,0], [0,-22], …`) until a free box is found.
4. Selected labels never drop; if every placement collides they overwrite.
5. Fade by distance, but never below 0.68 — a label that survived decluttering
   must remain readable.

## Modifier classes

| Class | When |
| --- | --- |
| `flight-label--active` | Selected sampled token |
| `flight-label--candidate` | Rejected alternative |
| `flight-label--uncertain` | Sampled, prob < 0.4 |
| `flight-label--steady` | Sampled, prob ≥ 0.7 |

CSS tokens (`--label-ink*`, `--label-border*`, `--halo-scene`) keep them
legible in both themes.

## Picking end-to-end

```
pointerup on canvas
  │  (ignore if moved ≥ 4 px)
  ▼
pickLocal(x, y) → route.pick({ camera, x, y, width, height })
  │
  ▼
onSelect(frameIndex, candidateToken|null)
  │
  ▼
App.pickInScene → setSelected, setCandidate, scene.flyTo(index)
  │
  ▼
TokenInspector / DetailRail highlight the row (is-chosen / is-picked)
```

Background field points are **not** pickable. They are vocabulary at rest; the
engine reported nothing about them. Clicking empty space does nothing.
