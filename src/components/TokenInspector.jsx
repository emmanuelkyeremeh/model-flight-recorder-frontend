import { useMemo } from "react";
import { DetailRail } from "./DetailRail.jsx";

/**
 * The floating read-out for whichever token the camera is parked on. It owns
 * the flag lookups so the app shell does not have to carry them around.
 */
export function TokenInspector({ frame, total, analysis, candidate }) {
  const sets = useMemo(() => ({
    stall: new Set((analysis?.stalls ?? []).map((entry) => entry.index)),
    tie: new Set((analysis?.coinFlips ?? []).map((entry) => entry.index)),
    guess: new Set((analysis?.guesses ?? []).map((entry) => entry.index)),
  }), [analysis]);

  return (
    <div className="hud hud--inspector">
      <DetailRail
        frame={frame}
        total={total}
        stalled={frame ? sets.stall.has(frame.index) : false}
        tied={frame ? sets.tie.has(frame.index) : false}
        guessed={frame ? sets.guess.has(frame.index) : false}
        candidate={candidate}
      />
    </div>
  );
}
