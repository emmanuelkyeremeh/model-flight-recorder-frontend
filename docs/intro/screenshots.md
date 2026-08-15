# Screenshots

Captured from a real SmolLM2 360M run on WebGPU
(`Explain time-to-first-token vs inter-token latency in one short paragraph.`).

## Opening brief

```{image} ../images/01-brief-dark.png
:alt: Opening brief
:width: 100%
```

Phase **READY**. The brief states the vocabulary size and how many points are
drawn. The dock waits for a prompt. The nav pad sits bottom-right.

## Recorded route

```{image} ../images/02-flight-dark.png
:alt: Recorded flight
:width: 100%
```

96 tokens. The inspector shows the selected token's gap, probability, logprob,
margin, and the top alternatives. The transcript and transport sit over the
scene. Finding chips: Before it said anything, Longest hesitation, Closest
call, Least certain word.

## Closest call

```{image} ../images/03-closest-call.png
:alt: Closest call framing
:width: 100%
```

Token 5, `training`, beat `knowledge` by 0.026 logprob. The ringed candidates
are labelled with their probabilities. The contested flag is lit in the
inspector.

## Analytics

```{image} ../images/04-analytics-dark.png
:alt: Analytics dark
:width: 100%
```

Headline metrics (TTFT, decode tok/s, ITL p50/p95, perplexity), five charts,
the per-token table, and grouped findings.

## Chart modal

```{image} ../images/05-chart-modal.png
:alt: Expanded confidence chart
:width: 100%
```

Any chart expands into a `<dialog>`. Axis units are drawn in the plot margins.

## Light mode

```{image} ../images/06-analytics-light.png
:alt: Analytics light
:width: 100%
```

Same surface, paper palette. CSS tokens, WebGL clear/fog/field/route colours,
and chart ink all flip from `theme.js`.
