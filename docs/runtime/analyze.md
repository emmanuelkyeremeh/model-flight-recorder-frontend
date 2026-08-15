# analyzeFlight

**Source:** `src/lib/analyzeFlight.js`

Turns a `FlightRecord` into the frames the rest of the app reads.

## Frames

For each token:

```js
{
  index,
  text,
  logprob,
  prob: Math.exp(logprob),          // null if logprob missing
  band: "locked"|"steady"|"split"|"guess"|"unknown",
  delayMs,                          // gap since previous token (or startedAt for #0)
  isPrefill: index === 0,
  alternatives,
  runnerUp,                         // strongest alternative that is not the chosen text
  margin,                           // chosen.logprob - runnerUp.logprob (may be negative)
}
```

### Confidence bands

| Band | Probability |
| --- | --- |
| `locked` | ≥ 0.70 |
| `steady` | ≥ 0.40 |
| `split` | ≥ 0.15 |
| `guess` | < 0.15 |
| `unknown` | no logprob |

## Aggregates

On top of `summarizeRecord`:

| Field | Meaning |
| --- | --- |
| `itlMsP99`, `itlMsMean`, `itlStd` | Tail and spread of ITL |
| `jitterCv` | `itlStd / itlMean` |
| `tailRatio` | `p95 / p50` |
| `prefillMs` / `decodeMs` | Wall split |
| `meanProb` | Mean of reported probabilities |
| `perplexity` | `exp(-mean(logprob))` |
| `histogram` | Auto-binned ITL histogram |
| `stalls` | Frames with `delayMs > 2.5 × p50` (excluding prefill) |
| `coinFlips` | Frames with `abs(margin) < 0.35` |
| `guesses` | Frames with `prob < 0.15` |
| `hardest` | Lowest-probability frame |

Thresholds are constants at the top of the file (`STALL_MULTIPLIER`,
`COIN_FLIP_MARGIN`, `GUESS_PROB`, `LOCKED_PROB`). Change them there, not in the
UI.

## Negative margins

Sampling can pick a token that was not the mode of the reported distribution
(temperature > 0). `margin` is allowed to be negative; `coinFlips` uses
`Math.abs(margin)` so a near-loss still counts as contested. The decision-margin
chart draws those bars below the centre line on purpose.
