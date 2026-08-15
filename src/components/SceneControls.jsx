import { useCallback, useEffect, useRef } from "react";
import { ORBIT_STEP } from "../lib/scene/flightScene.js";

/**
 * Explicit navigation for a scene that also responds to drag and wheel. The
 * gestures are faster once you know them; the pad is what makes them known, and
 * it is the only way to zoom on a trackpad-less touch device.
 */

const HOLD_DELAY_MS = 240;
const HOLD_REPEAT_MS = 90;

/**
 * A held key repeats, because one ten-degree nudge is rarely what you wanted.
 * Keyboard activation still lands on `onClick`. A pointer that never crossed
 * the hold delay also lands there once. A pointer that did fire repeats must
 * suppress the trailing click, or the release would add one more nudge.
 */
function useRepeat() {
  const timers = useRef({ delay: 0, repeat: 0, held: false });

  const stop = useCallback(() => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
    const held = timers.current.held;
    timers.current = { delay: 0, repeat: 0, held: false };
    return held;
  }, []);

  useEffect(() => () => { stop(); }, [stop]);

  const start = useCallback((action) => {
    stop();
    timers.current.delay = window.setTimeout(() => {
      timers.current.held = true;
      action();
      timers.current.repeat = window.setInterval(action, HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  }, [stop]);

  return { start, stop };
}

function PadKey({ area, label, onPress, children }) {
  const { start, stop } = useRepeat();
  const suppressClick = useRef(false);

  return (
    <button
      type="button"
      className={`navpad__key navpad__key--${area}`}
      aria-label={label}
      title={label}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onPress();
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        start(onPress);
      }}
      onPointerUp={() => {
        suppressClick.current = stop();
      }}
      onPointerLeave={() => {
        suppressClick.current = stop();
      }}
      onPointerCancel={() => {
        suppressClick.current = stop();
      }}
      onBlur={() => {
        stop();
      }}
    >
      {children}
    </button>
  );
}

function ChevronIcon({ down = false }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d={down ? "M4.5 6.5 8 10 11.5 6.5" : "M4.5 9.5 8 6 11.5 9.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An arc with a head on it: rotation, not translation. */
function OrbitIcon({ mirrored = false }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className={mirrored ? "icon--mirrored" : undefined}
    >
      <path
        d="M2.9 10.6a5.4 5.4 0 0 1 10.2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.6 9.6 13.2 10.8 12.2 13.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * An attitude indicator: wings over a filled ground. The ground is what keeps
 * it from reading as a prohibition sign next to the zoom keys.
 */
function LevelIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.13 8.6A5.9 5.9 0 0 0 13.87 8.6Z"
        fill="currentColor"
        fillOpacity="0.28"
      />
      <circle cx="8" cy="8" r="5.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M4.4 7.6h2.4 M9.2 7.6h2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The recorder's own mark, which is also what the reticle looks like. */
function ReticleIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M1.6 8h2.6 M11.8 8h2.6 M8 1.6v2.6 M8 11.8v2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ZoomIcon({ out = false }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d={out ? "M3.5 8h9" : "M3.5 8h9M8 3.5v9"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SceneControls({
  onZoomIn,
  onZoomOut,
  onOrbit,
  onLevel,
  onRecentre,
}) {
  return (
    <div className="navpad">
      <div className="navpad__grid" role="group" aria-label="Scene navigation">
        <PadKey area="up" label="Tilt up" onPress={() => onOrbit(0, -ORBIT_STEP)}>
          <ChevronIcon />
        </PadKey>
        <PadKey area="left" label="Orbit left" onPress={() => onOrbit(ORBIT_STEP, 0)}>
          <OrbitIcon mirrored />
        </PadKey>
        <PadKey area="level" label="Level the view" onPress={onLevel}>
          <LevelIcon />
        </PadKey>
        <PadKey area="right" label="Orbit right" onPress={() => onOrbit(-ORBIT_STEP, 0)}>
          <OrbitIcon />
        </PadKey>
        <PadKey area="down" label="Tilt down" onPress={() => onOrbit(0, ORBIT_STEP)}>
          <ChevronIcon down />
        </PadKey>

        <span className="navpad__rule" aria-hidden="true" />

        <PadKey area="out" label="Zoom out" onPress={onZoomOut}>
          <ZoomIcon out />
        </PadKey>
        <PadKey area="home" label="Recentre the view" onPress={onRecentre}>
          <ReticleIcon />
        </PadKey>
        <PadKey area="in" label="Zoom in" onPress={onZoomIn}>
          <ZoomIcon />
        </PadKey>
      </div>

      <p className="navpad__hint">
        Hold and drag to orbit
        {" · "}
        click a node to fly to it
        {" · "}
        scrub to travel
      </p>
    </div>
  );
}
