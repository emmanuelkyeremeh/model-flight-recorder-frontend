# Analytics

**Sources:** `src/components/AnalyticsPanel.jsx`, `src/lib/charts.js`

## Headline metrics

From `RunHeader`, each with an InfoButton:

| Metric | Unit | Meaning |
| --- | --- | --- |
| TTFT | ms | Time to first token |
| Decode | tok/s | Decode throughput |
| ITL p50 | ms | Typical inter-token gap |
| ITL p95 | ms | Tail gap |
| Perplexity | — | `exp(-mean logprob)` |

## Charts

All canvas. Units are drawn in the plot margins by `axisUnits`.

| Chart | Y | X | Notes |
| --- | --- | --- | --- |
| Gap per token | ms | token index | p50 / p95 / p99 reference lines |
| Gap distribution | token count | ms bins | Auto edges; open top bin for stalls |
| Confidence per token | probability 0–1 | token index | Runner-up drawn behind |
| Decision margin | logprob | token index | Negative = sampled a non-mode |
| Pace vs confidence | ms | confidence % | Scatter |

`setChartTheme(theme)` swaps the ink palette. `AnalyticsPanel` calls it on
mount and whenever `theme` changes.

## Per-token table

`ContactSheet` columns: index, token, Δt ms, p%, confidence bar, margin,
runner-up, flags (`S` / `T` / `G`). Click or arrow-key to inspect. The selected
row scrolls into view.

## Findings rail

Three groups with the rule printed under the title:

- **Stalls** — gap over 2.5× median
- **Contested** — another token nearly won
- **Low integrity** — winner under 15% probability

Clicking an entry calls `onSelect(index)`, which glides the flight camera when
you switch back to the Flight tab.
