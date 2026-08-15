# Mental model

Hold three objects in your head and the rest of the codebase falls into place.

## 1. The recording (`FlightRecord`)

A plain object. One per run. Appended to as tokens arrive. Finished once.
Everything else is derived from it: charts, findings, the corridor, the receipt.

```
startedAt ──► firstTokenAt ──► token.at ──► token.at ──► … ──► finishedAt
                 TTFT            ITL           ITL
```

Each token carries `text`, `at` (performance.now), `logprob`, and
`alternatives` (top-k from WebLLM).

## 2. The corridor

A pure function of the recording's frames. No Three.js, no DOM. It answers:
"where in space does each token live, and where do its rejected candidates sit?"

```
forward (z)  = log-scaled elapsed time
altitude (y) = probability of the sampled token
ring radius  = how far behind the winner a candidate finished
halo radius  = how unsure the model was
```

There is no decorative lateral wander. An earlier version had one; it invited
people to read meaning out of an axis that held none.

## 3. The scene

One WebGL context for the whole session. It receives corridor updates,
selection, follow, reveal, busy, theme. It never unmounts between phases.
React chrome floats over it.

```
                ┌──────────── App.jsx ────────────┐
                │  useRecorder  useTheme  state    │
                └───────────────┬──────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   FlightScene            TokenInspector         AnalyticsPanel
   (imperative            ReadingPanel           (canvas charts)
    Three.js)             Transport
                          PromptDock
                          SceneControls
```

## Data flow for one token

```
WebLLM chunk
   │
   ▼
onToken({ text, at, logprob, alternatives })
   │
   ▼
appendToken(record, event)          ← pure
   │
   ▼
setRecord(updated)                  ← React state
   │
   ├── analyzeFlight(record)        ← useMemo
   │      └── frames[]
   │
   ├── buildCorridor(frames)        ← useMemo
   │      └── { waypoints, alternates }
   │
   └── FlightScene.setCorridor(...) ← imperative, writes GPU matrices
```

When you next click a node, the scene calls `onSelect(frameIndex, candidate?)`,
App updates `selected` / `candidate`, and the inspector reads the same frame
the route already knows about. One source of truth, two surfaces.

## Travel vs fly-to

This distinction confuses people the first time they try to "drag to the last
token." Dragging orbits around the current subject. To travel along the route
you scrub the timeline (or click the transcript). The camera then glides to
each token at your current distance. Clicking a node, pressing Follow, or
hitting a finding chip pulls in close. Both are wired; they do different jobs.
