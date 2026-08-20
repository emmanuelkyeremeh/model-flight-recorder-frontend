import * as THREE from "three";
import { createCameraRig } from "./cameraRig.js";
import { createGrid, createReticle } from "./instruments.js";
import { createRouteLayer } from "./routeLayer.js";
import { createVocabularyField } from "./vocabularyField.js";
import { THEME, scenePalette } from "../theme.js";

/**
 * The scene is created once and lives for the whole session. Loading a model,
 * running a prompt and reading the result are all changes of state inside this
 * one context — nothing here is ever torn down and rebuilt between phases,
 * because that is what made the old view blink.
 */

const LABEL_SLOTS = 36;
const MAX_PIXEL_RATIO = 1.5;
/* One press should be a noticeable step but never lose your place. */
const ZOOM_STEP = 1.32;
/* Framing distance for a deliberate focus — clicking Follow, or fly-to's default. */
const FOLLOW_DISTANCE = 16;
/* Pixels a candidate's label is pushed clear of the token it orbits. */
const CANDIDATE_LABEL_NUDGE = 18;
/* Fallback spots for a candidate label whose own node is already crowded. */
const CANDIDATE_PLACEMENTS = Object.freeze([
  [0, 0],
  [0, -22],
  [0, 22],
  [-30, 0],
  [30, 0],
  [0, -44],
  [0, 44],
]);
const ORIGIN_ONLY = Object.freeze([[0, 0]]);
export const ORBIT_STEP = Math.PI / 18;
/* A stalled tab or a slow frame must not teleport the drift or the camera. */
const MAX_FRAME_DELTA = 0.05;

/**
 * The scene needs a clamped delta and a monotonic elapsed time, which is less
 * than THREE.Clock offers and it is deprecated anyway. Elapsed advances only by
 * the deltas actually spent rendering, so time paused in a hidden tab does not
 * jump the drift when the tab comes back.
 */
export function createSceneClock(now = () => performance.now()) {
  let last = now();
  let elapsed = 0;

  return {
    tick(maxDelta = MAX_FRAME_DELTA) {
      const stamp = now();
      const delta = Math.min(Math.max(stamp - last, 0) / 1000, maxDelta);
      last = stamp;
      elapsed += delta;
      return { delta, elapsed };
    },
    /** Discards the gap accumulated while the loop was parked. */
    resume() {
      last = now();
    },
  };
}

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false);
}

/** Point budget sized to the device. The vocabulary decides how many we draw. */
export function fieldBudget() {
  if (typeof navigator === "undefined") {
    return 24000;
  }
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = navigator.deviceMemory ?? 4;
  return cores <= 4 || memory <= 4 ? 22000 : 60000;
}

function createLabelLayer(container) {
  const root = document.createElement("div");
  root.className = "flight-scene__labels";
  root.setAttribute("aria-hidden", "true");
  container.appendChild(root);

  const slots = [];
  for (let i = 0; i < LABEL_SLOTS; i += 1) {
    const node = document.createElement("span");
    node.className = "flight-label";
    node.style.opacity = "0";
    root.appendChild(node);
    slots.push({ node, text: "" });
  }

  return {
    slots,
    hideFrom(index) {
      for (let i = index; i < slots.length; i += 1) {
        slots[i].node.style.opacity = "0";
      }
    },
    dispose() {
      root.remove();
    },
  };
}

/**
 * `?probe=1` keeps the drawing buffer around so the rendered frame can be read
 * back and measured. Without it a WebGL canvas is a black box to any automated
 * check — screenshots of it are at the mercy of the compositor.
 */
function probeEnabled() {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("probe") === "1";
}

export function createFlightScene({ container, onSelect, vocabTokens, theme: initialTheme }) {
  const probe = probeEnabled();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: probe,
  });
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.className = "flight-scene__canvas";

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0042);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.5, 1400);

  const field = createVocabularyField({ count: fieldBudget() });
  field.setVisibleCount(Math.min(field.capacity, vocabTokens ?? field.capacity));
  const route = createRouteLayer();
  const grid = createGrid();
  const reticle = createReticle();
  scene.add(field.object, grid.object, route.object, reticle.object);

  const rig = createCameraRig(camera, renderer.domElement);
  const labels = createLabelLayer(container);
  const clock = createSceneClock();
  const projected = new THREE.Vector3();
  /* Where the cursor is, so hover can be resolved once per frame instead of on
     every mousemove event. */
  const hover = { x: 0, y: 0, inside: false, hot: false };

  let corridor = { waypoints: [], alternates: [], length: 0 };
  let selected = 0;
  let follow = true;
  let reveal = 1;
  let running = true;
  let frameId = 0;
  let pixelRatio = 1;
  let width = 1;
  let height = 1;
  let busy = false;
  let theme = THEME.DARK;
  const reduced = prefersReducedMotion();

  function applyTheme(nextTheme) {
    theme = nextTheme === THEME.LIGHT ? THEME.LIGHT : THEME.DARK;
    const palette = scenePalette(theme);
    renderer.setClearColor(palette.clear, 1);
    scene.fog.color.set(palette.fog);
    scene.fog.density = palette.fogDensity;
    field.setPalette({
      deep: palette.fieldDeep,
      cool: palette.fieldCool,
      commit: palette.fieldCommit,
      additive: palette.fieldAdditive,
    });
    route.setPalette({
      ink: palette.routeInk,
      uncertain: palette.routeUncertain,
      dim: palette.routeDim,
      accent: palette.routeAccent,
    });
    reticle.setColor(palette.reticle);
    grid.setColor(palette.grid);
    grid.setOpacity(palette.gridOpacity);
  }

  rig.rest();
  applyTheme(initialTheme ?? THEME.DARK);

  function applySize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    pixelRatio = busy ? 1 : Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    field.setPixelRatio(pixelRatio);
    route.setPixelRatio(pixelRatio);
  }

  function currentWaypoint() {
    if (corridor.waypoints.length === 0) {
      return null;
    }
    const index = Math.min(Math.max(selected, 0), corridor.waypoints.length - 1);
    return corridor.waypoints[index];
  }

  /**
   * Labels are written straight to the DOM from the render loop. Routing them
   * through React would re-render the tree sixty times a second for text that
   * only moves a few pixels.
   */
  function pickLocal(x, y) {
    return route.pick({ camera, x, y, width, height });
  }

  /**
   * The candidates the model weighed at the selected step, named on screen.
   * Without these the ringed nodes look like scenery; with them the step reads
   * as a decision between tokens you can actually see.
   */
  function candidateLabels() {
    return route.candidatesAt(selected).map((candidate) => ({
      position: candidate.position,
      /* Pushed away from the token it orbits, so the ring's own labels do not
         pile onto the one at the centre and lose the declutter pass. */
      awayFrom: candidate.anchor,
      text: candidate.prob == null
        ? candidate.label
        : `${candidate.label}  ${(candidate.prob * 100).toFixed(1)}%`,
      kind: "candidate",
      prob: candidate.prob,
      rank: 1,
    }));
  }

  function sampledLabels() {
    const entries = [];
    for (const point of corridor.waypoints) {
      const distance = camera.position.distanceTo(
        projected.set(point.position.x, point.position.y, point.position.z),
      );
      const chosen = point.frameIndex === selected;
      if (!chosen && distance > 78) {
        continue;
      }
      entries.push({
        position: point.position,
        text: point.label,
        kind: "sampled",
        prob: point.prob,
        chosen,
        distance,
        rank: chosen ? 0 : 2 + distance / 1000,
      });
    }
    return entries;
  }

  function updateLabels() {
    if (corridor.waypoints.length === 0) {
      labels.hideFrom(0);
      return;
    }

    const entries = [...sampledLabels(), ...candidateLabels()]
      .sort((left, right) => left.rank - right.rank)
      .slice(0, LABEL_SLOTS);

    let used = 0;
    const occupied = [];
    for (const entry of entries) {
      projected.set(entry.position.x, entry.position.y, entry.position.z).project(camera);
      if (projected.z > 1) {
        continue;
      }
      const slot = labels.slots[used];
      let x = (projected.x * 0.5 + 0.5) * width;
      let y = (-projected.y * 0.5 + 0.5) * height;
      const isCandidate = entry.kind === "candidate";

      if (entry.awayFrom) {
        projected
          .set(entry.awayFrom.x, entry.awayFrom.y, entry.awayFrom.z)
          .project(camera);
        const cx = (projected.x * 0.5 + 0.5) * width;
        const cy = (-projected.y * 0.5 + 0.5) * height;
        const span = Math.hypot(x - cx, y - cy);
        if (span > 0.5) {
          x += ((x - cx) / span) * CANDIDATE_LABEL_NUDGE;
          y += ((y - cy) / span) * CANDIDATE_LABEL_NUDGE;
        }
      }
      /* A label that survives decluttering must remain readable. Distance can
         soften it, but never fade it into the field it is meant to explain. */
      const fade = entry.chosen || isCandidate
        ? 1
        : 0.68 + Math.max(0, 1 - entry.distance / 78) * 0.28;
      const labelWidth = Math.max(44, entry.text.length * 7.5 + 18);
      /* Sampled labels hang above-right of their node on a stem. Candidate
         labels sit on their node, and may shuffle to a free spot nearby: at the
         selected step they are the point of the interaction, so dropping one is
         worse than moving it a few pixels off its node. */
      const boxAt = (bx, by) => (isCandidate
        ? {
          left: bx - labelWidth / 2,
          right: bx + labelWidth / 2,
          top: by - 13,
          bottom: by + 13,
        }
        : {
          left: bx + 8,
          right: bx + 8 + labelWidth,
          top: by - 34,
          bottom: by - 8,
        });
      const free = (box) => occupied.every((other) => (
        box.right < other.left
        || box.left > other.right
        || box.bottom < other.top
        || box.top > other.bottom
      ));

      let bounds = null;
      for (const [offsetX, offsetY] of isCandidate ? CANDIDATE_PLACEMENTS : ORIGIN_ONLY) {
        const box = boxAt(x + offsetX, y + offsetY);
        if (free(box)) {
          bounds = box;
          x += offsetX;
          y += offsetY;
          break;
        }
      }
      if (bounds === null) {
        if (!entry.chosen) {
          continue;
        }
        bounds = boxAt(x, y);
      }
      occupied.push(bounds);

      if (slot.text !== entry.text) {
        slot.node.textContent = entry.text;
        slot.text = entry.text;
      }
      slot.node.style.transform = isCandidate
        ? `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -50%)`
        : `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      slot.node.style.opacity = fade.toFixed(2);
      slot.node.classList.toggle("flight-label--active", Boolean(entry.chosen));
      slot.node.classList.toggle("flight-label--candidate", isCandidate);
      slot.node.classList.toggle(
        "flight-label--uncertain",
        !isCandidate && (entry.prob ?? 1) < 0.4,
      );
      slot.node.classList.toggle(
        "flight-label--steady",
        !isCandidate && (entry.prob ?? 0) >= 0.7,
      );
      used += 1;
    }
    labels.hideFrom(used);
  }

  /** Cursor feedback, resolved once per frame from the last known position. */
  function updateHover() {
    const hot = hover.inside
      && !rig.dragging
      && corridor.waypoints.length > 0
      && pickLocal(hover.x, hover.y) !== null;
    if (hot !== hover.hot) {
      hover.hot = hot;
      renderer.domElement.classList.toggle("is-hot", hot);
    }
  }

  /** One frame of simulation and drawing, independent of what drives it. */
  function frame(delta, elapsed) {
    const head = currentWaypoint();

    if (follow && head) {
      /* Following is a held focus, not an idle wander: stop the breathing orbit
         so the tracked token stays put instead of sliding under a drifting camera.
         Distance is left alone so zooming while following still works. */
      rig.stopDrift();
      rig.lookAt(head.position);
    }

    rig.update(reduced ? delta * 0.35 : delta, elapsed);
    field.update(delta, elapsed, {
      cameraZ: camera.position.z,
      headZ: head?.position.z ?? 0,
      reveal,
    });
    grid.update(camera.position.z);
    reticle.update(delta, camera, elapsed);
    updateLabels();
    updateHover();

    renderer.render(scene, camera);
  }

  function loop() {
    frameId = window.requestAnimationFrame(loop);
    if (!running) {
      return;
    }
    const { delta, elapsed } = clock.tick(MAX_FRAME_DELTA);
    frame(delta, elapsed);
  }

  let downX = 0;
  let downY = 0;
  function onDown(event) {
    downX = event.clientX;
    downY = event.clientY;
  }
  function onUp(event) {
    /* Only treat it as a pick if the pointer barely moved; otherwise the user
       was orbiting and does not expect the selection to jump. */
    if (Math.hypot(event.clientX - downX, event.clientY - downY) >= 4) {
      return;
    }
    const bounds = renderer.domElement.getBoundingClientRect();
    const hit = pickLocal(event.clientX - bounds.left, event.clientY - bounds.top);
    if (hit) {
      onSelect?.(hit.frameIndex, hit.kind === "candidate" ? hit.token : null);
    }
  }

  function onHoverMove(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    hover.x = event.clientX - bounds.left;
    hover.y = event.clientY - bounds.top;
    hover.inside = true;
  }

  function onHoverLeave() {
    hover.inside = false;
  }

  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointermove", onHoverMove);
  renderer.domElement.addEventListener("pointerleave", onHoverLeave);

  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver(applySize)
    : null;
  observer?.observe(container);
  if (!observer) {
    window.addEventListener("resize", applySize);
  }

  function onVisibility() {
    running = document.visibilityState === "visible";
    if (running) {
      clock.resume();
    }
  }
  document.addEventListener("visibilitychange", onVisibility);

  applySize();
  loop();

  if (probe) {
    /* Exposed only under the probe flag, for automated visual checks. */
    let probeElapsed = 0;
    window.__flightProbe = {
      /* Drives real frames without rAF, which some embedded views never fire. */
      step(count = 1, delta = 1 / 60) {
        for (let i = 0; i < count; i += 1) {
          probeElapsed += delta;
          frame(delta, probeElapsed);
        }
      },
      renderOnce: () => renderer.render(scene, camera),
      /* Canvas-relative, so a check can aim at a node without a real cursor. */
      pick: (x, y) => pickLocal(x, y),
      labels: () => [...container.querySelectorAll(".flight-label")]
        .filter((node) => Number.parseFloat(node.style.opacity) > 0.05)
        .map((node) => node.textContent),
      stats: () => ({
        drawCalls: renderer.info.render.calls,
        points: renderer.info.render.points,
        triangles: renderer.info.render.triangles,
        vocabularyPoints: field.visibleCount,
        waypoints: corridor.waypoints.length,
        cameraZ: Number(camera.position.z.toFixed(2)),
      }),
    };
  }

  return {
    setCorridor(next) {
      const grew = next.waypoints.length > corridor.waypoints.length;
      corridor = next;
      route.sync(next);
      if (grew) {
        field.strike();
      }
    },

    setSelected(index) {
      selected = index;
      route.highlight(index);
      const point = currentWaypoint();
      if (!point) {
        reticle.hide();
        return;
      }
      reticle.moveTo(point.position);
      /* Any selection made while not following — scrubbing the timeline, clicking
         a token in the transcript — glides the camera onto that token, keeping the
         current distance. This is how you travel between nodes: move the scrubber
         to the last token and the camera rides out to it. A click on a node in the
         scene goes further and pulls in close, through flyTo. */
      if (!follow) {
        rig.lookAt(point.position);
      }
    },

    setFollow(value) {
      const wasFollowing = follow;
      follow = value;
      if (!value) {
        rig.stopDrift();
        return;
      }
      /* Turning follow on reframes the current subject the same way a fly-to does,
         so "Follow" snaps to the token instead of leaving the camera wherever it
         happened to be parked. */
      if (!wasFollowing) {
        const point = currentWaypoint();
        if (point) {
          rig.stopDrift();
          rig.lookAt(point.position, { distance: FOLLOW_DISTANCE });
        }
      }
    },

    /** Frames a token deliberately: stops following and settles the camera. */
    flyTo(index, { distance = FOLLOW_DISTANCE } = {}) {
      selected = index;
      follow = false;
      const point = currentWaypoint();
      if (!point) {
        return;
      }
      route.highlight(index);
      reticle.moveTo(point.position);
      rig.lookAt(point.position, { distance });
    },

    /**
     * On-screen navigation. Zoom and orbit leave the subject alone, so pressing
     * a button while the camera is following the newest token adjusts the view
     * of it rather than abandoning it.
     */
    zoomIn() {
      rig.zoomBy(1 / ZOOM_STEP);
    },

    zoomOut() {
      rig.zoomBy(ZOOM_STEP);
    },

    orbit(deltaTheta, deltaPhi) {
      rig.orbitBy(deltaTheta, deltaPhi);
    },

    level() {
      rig.level();
    },

    /** Back to the wide idle framing over the empty field. */
    rest() {
      follow = false;
      reticle.hide();
      rig.rest();
    },

    /** Dims the field while WebGPU is busy compiling or generating. */
    setReveal(value) {
      reveal = value;
    },

    /**
     * WebLLM and WebGL share unified memory on Apple Silicon. During model
     * work, reduce fill-rate and ambient motion before either becomes janky.
     */
    setBusy(value) {
      busy = Boolean(value);
      field.setDrift(busy ? 0.2 : 1);
      applySize();
    },

    setTheme(nextTheme) {
      applyTheme(nextTheme);
    },

    /** How many vocabulary points are actually on screen right now. */
    setVocabulary(tokens) {
      return field.setVisibleCount(Math.min(field.capacity, tokens ?? field.capacity));
    },

    get drawnTokens() {
      return field.visibleCount;
    },

    resize: applySize,

    dispose() {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onHoverMove);
      renderer.domElement.removeEventListener("pointerleave", onHoverLeave);
      observer?.disconnect();
      if (!observer) {
        window.removeEventListener("resize", applySize);
      }
      if (probe && window.__flightProbe) {
        delete window.__flightProbe;
      }
      rig.dispose();
      labels.dispose();
      field.dispose();
      route.dispose();
      grid.dispose();
      reticle.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
