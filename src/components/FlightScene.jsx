import { useEffect, useRef, useState } from "react";
import { createFlightScene } from "../lib/scene/flightScene.js";

/**
 * A single mount point for the whole session. Every prop change is forwarded to
 * the live scene as a method call, so the WebGL context is created once and
 * never torn down while the user is working.
 */
export function FlightScene({
  corridor,
  selected,
  follow,
  reveal,
  busy,
  vocabTokens,
  theme,
  onSelect,
  sceneRef,
}) {
  const mountRef = useRef(null);
  const localRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const themeRef = useRef(theme);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    let scene;
    try {
      scene = createFlightScene({
        container: mount,
        vocabTokens,
        theme: themeRef.current,
        onSelect: (index, candidate) => onSelectRef.current?.(index, candidate),
      });
    } catch {
      setFailed(true);
      return undefined;
    }

    localRef.current = scene;
    if (sceneRef) {
      sceneRef.current = scene;
    }

    return () => {
      localRef.current = null;
      if (sceneRef) {
        sceneRef.current = null;
      }
      scene.dispose();
    };
    /* Deliberately mounted once: vocabTokens is applied through setVocabulary
       below so that changing model never rebuilds the GL context. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localRef.current?.setVocabulary(vocabTokens);
  }, [vocabTokens]);

  useEffect(() => {
    localRef.current?.setCorridor(corridor);
  }, [corridor]);

  /* Follow is applied before selection so that when a scrub turns following off
     and moves the selection in the same commit, setSelected already sees the new
     follow state and glides the camera to the scrubbed token. */
  useEffect(() => {
    localRef.current?.setFollow(follow);
  }, [follow]);

  useEffect(() => {
    localRef.current?.setSelected(selected);
  }, [selected]);

  useEffect(() => {
    localRef.current?.setReveal(reveal);
  }, [reveal]);

  useEffect(() => {
    localRef.current?.setBusy(busy);
  }, [busy]);

  useEffect(() => {
    localRef.current?.setTheme(theme);
  }, [theme]);

  if (failed) {
    return (
      <div className="flight-scene flight-scene--failed">
        <p>
          This browser could not open a WebGL context, so the flight view is
          unavailable. Every measurement is still recorded — open Analytics to
          read the run.
        </p>
      </div>
    );
  }

  return <div className="flight-scene" ref={mountRef} />;
}
