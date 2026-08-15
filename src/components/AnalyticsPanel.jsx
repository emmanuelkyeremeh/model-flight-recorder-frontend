import { useCallback, useEffect, useMemo } from "react";
import { Chart } from "./Chart.jsx";
import { ContactSheet } from "./ContactSheet.jsx";
import { DetailRail } from "./DetailRail.jsx";
import { Findings } from "./Findings.jsx";
import { RunHeader } from "./RunHeader.jsx";
import {
  drawConfidence,
  drawDecisionMargin,
  drawHistogram,
  drawLatency,
  drawLatencyConfidence,
  latencyCeiling,
  setChartTheme,
} from "../lib/charts.js";

const STALL_MULTIPLIER = 2.5;

function SplitBar({ prefillMs, decodeMs }) {
  const prefill = prefillMs ?? 0;
  const decode = decodeMs ?? 0;
  const total = prefill + decode || 1;
  const prefillPct = (prefill / total) * 100;

  return (
    <section className="split">
      <p className="rail__label">Where the time went</p>
      <div
        className="split__bar"
        role="img"
        aria-label={`Prefill ${Math.round(prefill)}ms, decode ${Math.round(decode)}ms`}
      >
        <span className="split__prefill" style={{ width: `${prefillPct}%` }}>
          {prefillPct > 22 ? "prefill" : null}
        </span>
        <span className="split__decode" style={{ width: `${100 - prefillPct}%` }}>
          {100 - prefillPct > 22 ? "decode" : null}
        </span>
      </div>
      <p className="split__legend">
        <span>
          prefill
          {" "}
          <b>{Math.round(prefill)}</b>
          ms
        </span>
        <span>
          decode
          {" "}
          <b>{Math.round(decode)}</b>
          ms
        </span>
        <span>
          {prefillPct.toFixed(0)}
          {"% waiting"}
        </span>
      </p>
    </section>
  );
}

/**
 * The forensic surface. Everything the flight view deliberately leaves out —
 * distributions, per-token rows, the grouped findings — lives here, for the
 * reader who has already seen the shape of the run and wants the numbers.
 */
export function AnalyticsPanel({ analysis, model, engineKind, selected, onSelect, theme }) {
  const frames = analysis?.frames ?? [];

  useEffect(() => {
    setChartTheme(theme);
  }, [theme]);

  const sets = useMemo(() => ({
    stall: new Set((analysis?.stalls ?? []).map((frame) => frame.index)),
    tie: new Set((analysis?.coinFlips ?? []).map((frame) => frame.index)),
    guess: new Set((analysis?.guesses ?? []).map((frame) => frame.index)),
  }), [analysis]);

  const delays = useMemo(
    () => frames.filter((frame) => !frame.isPrefill).map((frame) => frame.delayMs),
    [frames],
  );

  const ceiling = latencyCeiling(delays, analysis?.itlMsP99);
  const stallThreshold = analysis?.itlMsP50 != null ? analysis.itlMsP50 * STALL_MULTIPLIER : null;
  const clamped = Math.min(Math.max(selected, 0), Math.max(0, frames.length - 1));
  const frame = frames[clamped] ?? null;

  const paintLatency = useCallback((ctx, size) => drawLatency(ctx, {
    ...size,
    delays,
    p50: analysis?.itlMsP50 ?? null,
    p95: analysis?.itlMsP95 ?? null,
    p99: analysis?.itlMsP99 ?? null,
    stallThreshold,
    selected: clamped - 1,
    live: false,
  }), [analysis, clamped, delays, stallThreshold, theme]);

  const paintHistogram = useCallback((ctx, size) => drawHistogram(ctx, {
    ...size,
    buckets: analysis?.histogram ?? [],
  }), [analysis, theme]);

  const paintConfidence = useCallback((ctx, size) => drawConfidence(ctx, {
    ...size,
    frames,
    selected: clamped,
  }), [clamped, frames, theme]);

  const paintMargin = useCallback((ctx, size) => drawDecisionMargin(ctx, {
    ...size,
    frames,
    selected: clamped,
  }), [clamped, frames, theme]);

  const paintLatencyConfidence = useCallback((ctx, size) => drawLatencyConfidence(ctx, {
    ...size,
    frames,
    p99: analysis?.itlMsP99 ?? null,
    stallThreshold,
    selected: clamped,
  }), [analysis?.itlMsP99, clamped, frames, stallThreshold, theme]);

  return (
    <div className="analytics">
      <div className="analytics__sheet">
        <RunHeader
          analysis={analysis}
          model={model}
          receipt={null}
          runtime={engineKind === "mock" ? "mock engine" : "webgpu · on-device"}
          phaseLabelText="COMPLETE"
        />

        <div className="analytics__body">
          <div className="analytics__main">
            <div className="run__charts">
              <Chart
                title="Gap per token"
                note="ms"
                draw={paintLatency}
                label="Inter-token latency per token with p50, p95 and p99 reference lines"
                description="The pause before each decoded token, in milliseconds. Taller bars mean a slower step. p50 is the typical gap; p95 and p99 (also in ms) expose tail latency and visible stutters."
              />
              <Chart
                title="Gap distribution"
                note="tokens"
                draw={paintHistogram}
                label="Histogram of inter-token gaps"
                description="How often each latency range occurred: the x-axis bins the gap in milliseconds, the y-axis counts tokens in each bin. A narrow cluster means steady pacing; a long right tail means occasional stalls even when the median looks healthy."
              />
              <Chart
                title="Confidence per token"
                note="probability"
                draw={paintConfidence}
                label="Probability of each chosen token with the runner-up behind it"
                description="The probability (0–1) assigned to the sampled token. Blue behind it is the strongest alternative. A small separation means the decision was contested; confidence is not factual correctness."
              />
              <Chart
                title="Decision margin"
                note="logprob"
                draw={paintMargin}
                label="Logprob margin between each sampled token and its strongest alternative"
                description="The sampled token's log-probability minus the strongest alternative's, in logprob (natural-log) units. Bars below the centre line mark sampling steps where the model selected a token that was not the most likely candidate. The axis is clipped to ±the largest margin in the run."
              />
              <Chart
                title="Pace vs confidence"
                note="ms vs %"
                draw={paintLatencyConfidence}
                label="Scatter plot comparing token confidence with the delay before each token"
                description="Each dot is one decoded token: the x-axis is its confidence as a percentage, the y-axis is the gap before it in milliseconds. Left means less confident; higher means slower. This tests whether hesitation and uncertainty moved together in this run without claiming that one caused the other."
              />
            </div>

            <section className="panel panel--sheet">
              <div className="panel__head">
                <h2>Per-token record</h2>
                <p className="legend">
                  {frames.length}
                  {" rows · click or arrow-key to inspect"}
                </p>
              </div>
              <ContactSheet
                frames={frames}
                selected={clamped}
                onSelect={onSelect}
                stallSet={sets.stall}
                tieSet={sets.tie}
                guessSet={sets.guess}
              />
            </section>
          </div>

          <div className="analytics__rail">
            <DetailRail
              frame={frame}
              total={frames.length}
              stalled={frame ? sets.stall.has(frame.index) : false}
              tied={frame ? sets.tie.has(frame.index) : false}
              guessed={frame ? sets.guess.has(frame.index) : false}
            />
            <SplitBar prefillMs={analysis?.prefillMs} decodeMs={analysis?.decodeMs} />
            <Findings analysis={analysis} onSelect={onSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
