import * as THREE from "three";
import { damp } from "./damp.js";

/**
 * One camera, three jobs, no fighting between them.
 *
 * The rig owns a target point and a spherical offset from it. Dragging edits
 * the offset, the wheel edits the distance, and programmatic moves edit the
 * target. Everything is damped toward a desired value each frame, so a fly-to
 * during a drag resolves smoothly instead of snapping or deadlocking.
 */

const MIN_DISTANCE = 4;
const MAX_DISTANCE = 220;
const MIN_POLAR = 0.12;
const MAX_POLAR = Math.PI - 0.12;

export function createCameraRig(camera, domElement) {
  const target = new THREE.Vector3(0, 0, 0);
  const goalTarget = new THREE.Vector3(0, 0, 0);
  const spherical = new THREE.Spherical(34, Math.PI * 0.42, Math.PI * 0.25);
  const goalSpherical = new THREE.Spherical(34, Math.PI * 0.42, Math.PI * 0.25);
  const offset = new THREE.Vector3();

  /**
   * Exactly one pointer drags at a time, identified by id. Anything that could
   * mean "the button is no longer down" ends the drag, because a missed release
   * would leave the camera chasing the cursor with nothing held.
   */
  let heldPointer = null;
  let lastX = 0;
  let lastY = 0;
  /* Idle drift is the scene breathing. Any deliberate input stops it. */
  let drift = true;

  function stopDrift() {
    drift = false;
  }

  function release(pointerId) {
    if (pointerId != null && domElement.hasPointerCapture?.(pointerId)) {
      domElement.releasePointerCapture(pointerId);
    }
    heldPointer = null;
  }

  function onPointerDown(event) {
    /* Secondary buttons belong to the context menu, not to the camera. */
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    heldPointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    stopDrift();
    domElement.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (heldPointer !== event.pointerId) {
      return;
    }
    /* A mouse move reporting no buttons means the release happened somewhere we
       never heard about — over a floating panel, or outside the window. */
    if (event.pointerType === "mouse" && event.buttons === 0) {
      release(event.pointerId);
      return;
    }

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    goalSpherical.theta -= dx * 0.005;
    goalSpherical.phi = THREE.MathUtils.clamp(
      goalSpherical.phi - dy * 0.005,
      MIN_POLAR,
      MAX_POLAR,
    );
  }

  function onPointerUp(event) {
    if (heldPointer !== event.pointerId) {
      return;
    }
    release(event.pointerId);
  }

  function onWindowRelease() {
    release(heldPointer);
  }

  function onWheel(event) {
    event.preventDefault();
    stopDrift();
    const scale = Math.exp(event.deltaY * 0.0012);
    goalSpherical.radius = THREE.MathUtils.clamp(
      goalSpherical.radius * scale,
      MIN_DISTANCE,
      MAX_DISTANCE,
    );
  }

  domElement.addEventListener("pointerdown", onPointerDown);
  domElement.addEventListener("pointermove", onPointerMove);
  domElement.addEventListener("pointerup", onPointerUp);
  domElement.addEventListener("pointercancel", onPointerUp);
  domElement.addEventListener("lostpointercapture", onPointerUp);
  domElement.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("pointerup", onWindowRelease);
  window.addEventListener("pointercancel", onWindowRelease);
  window.addEventListener("blur", onWindowRelease);

  return {
    /** Move the point the camera studies. Used by follow mode and fly-to. */
    lookAt(point, { distance, immediate = false } = {}) {
      goalTarget.set(point.x, point.y, point.z);
      if (typeof distance === "number") {
        goalSpherical.radius = THREE.MathUtils.clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
      }
      if (immediate) {
        target.copy(goalTarget);
        spherical.radius = goalSpherical.radius;
      }
    },

    /**
     * Multiply the viewing distance. On-screen controls call this with the same
     * kind of factor a wheel gesture produces, so a button press and a scroll
     * are the same motion at different granularity.
     */
    zoomBy(factor) {
      stopDrift();
      goalSpherical.radius = THREE.MathUtils.clamp(
        goalSpherical.radius * factor,
        MIN_DISTANCE,
        MAX_DISTANCE,
      );
    },

    /** Swing around the target, in radians. Positive phi tilts toward the top. */
    orbitBy(deltaTheta, deltaPhi) {
      stopDrift();
      goalSpherical.theta += deltaTheta;
      goalSpherical.phi = THREE.MathUtils.clamp(
        goalSpherical.phi + deltaPhi,
        MIN_POLAR,
        MAX_POLAR,
      );
    },

    /** Recover the default attitude without giving up the current subject. */
    level() {
      stopDrift();
      goalSpherical.theta = Math.PI * 0.22;
      goalSpherical.phi = Math.PI * 0.46;
    },

    /** A framing for the idle field: far back, looking down the corridor. */
    rest() {
      goalTarget.set(0, 0, -26);
      goalSpherical.set(46, Math.PI * 0.46, Math.PI * 0.22);
      drift = true;
    },

    stopDrift,

    update(delta, elapsed) {
      if (drift) {
        /* Two irrational periods, so the idle orbit never visibly repeats. */
        goalSpherical.theta = Math.PI * 0.22 + Math.sin(elapsed * 0.043) * 0.28;
        goalSpherical.phi = Math.PI * 0.46 + Math.cos(elapsed * 0.031) * 0.07;
      }

      target.x = damp(target.x, goalTarget.x, 3.2, delta);
      target.y = damp(target.y, goalTarget.y, 3.2, delta);
      target.z = damp(target.z, goalTarget.z, 3.2, delta);

      spherical.radius = damp(spherical.radius, goalSpherical.radius, 4, delta);
      spherical.theta = damp(spherical.theta, goalSpherical.theta, 5, delta);
      spherical.phi = damp(spherical.phi, goalSpherical.phi, 5, delta);
      spherical.makeSafe();

      offset.setFromSpherical(spherical);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);
    },

    /** True only while a button is actually held down on the canvas. */
    get dragging() {
      return heldPointer !== null;
    },

    dispose() {
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerup", onPointerUp);
      domElement.removeEventListener("pointercancel", onPointerUp);
      domElement.removeEventListener("lostpointercapture", onPointerUp);
      domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerup", onWindowRelease);
      window.removeEventListener("pointercancel", onWindowRelease);
      window.removeEventListener("blur", onWindowRelease);
    },
  };
}
