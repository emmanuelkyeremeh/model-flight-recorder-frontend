# Telemetry helpers

**Source:** `src/lib/telemetry.js`

Small pure maths used by `flightRecord`, `analyzeFlight`, and the charts.

| Function | Behaviour |
| --- | --- |
| `percentile(values, rank)` | Nearest-rank, 0–100. Empty → `null`. |
| `median(values)` | `percentile(..., 50)` |
| `mean(values)` | Arithmetic mean, empty → `null` |
| `stddev(values)` | Sample stddev (n − 1), needs ≥ 2 values |
| `roundTo(value, digits)` | Null-safe rounding |
| `autoEdges(values, maxBins=14)` | Nice millisecond bin edges from the data; open top bin |
| `histogram(values, edges)` | `{ start, end, count }[]` |

`autoEdges` snaps to a fixed list of nice steps
(`[0.5, 1, 2, 2.5, 5, 10, …, 1000]`) so a steady run does not produce
sub-millisecond bins that print identical tick labels. The top edge is
`Infinity` so stalls land in a visible tail bin instead of stretching the axis.
