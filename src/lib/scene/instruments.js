import * as THREE from "three";
import { damp } from "./damp.js";

/**
 * Cockpit furniture: the reticle that marks the token under inspection, and a
 * ground grid that gives the corridor a floor to be measured against.
 *
 * Both are drawn in thin lines on purpose. Real head-up symbology is hairline
 * geometry, and it is the one place where a 1px line is the correct answer
 * rather than a limitation.
 */

const GRID_SPACING = 20;
const GRID_HALF_WIDTH = 6;
const GRID_DEPTH = 26;

/** The flight path vector: circle, two wings, one fin. Also the app's logo. */
export function createReticle({ color = 0x52a8ff } = {}) {
  const points = [];
  const SEGMENTS = 48;

  for (let i = 0; i < SEGMENTS; i += 1) {
    const a = (i / SEGMENTS) * Math.PI * 2;
    const b = ((i + 1) / SEGMENTS) * Math.PI * 2;
    points.push(Math.cos(a), Math.sin(a), 0, Math.cos(b), Math.sin(b), 0);
  }

  points.push(-2.5, 0, 0, -1, 0, 0);
  points.push(1, 0, 0, 2.5, 0, 0);
  points.push(0, 1, 0, 0, 2.2, 0);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });

  const reticle = new THREE.LineSegments(geometry, material);
  reticle.renderOrder = 10;
  reticle.visible = false;

  const goal = new THREE.Vector3();
  let armed = false;

  return {
    object: reticle,

    moveTo(position) {
      goal.set(position.x, position.y, position.z);
      if (!armed) {
        reticle.position.copy(goal);
        armed = true;
      }
      reticle.visible = true;
    },

    hide() {
      reticle.visible = false;
      armed = false;
    },

    update(delta, camera, elapsed) {
      if (!reticle.visible) {
        return;
      }
      reticle.position.set(
        damp(reticle.position.x, goal.x, 7, delta),
        damp(reticle.position.y, goal.y, 7, delta),
        damp(reticle.position.z, goal.z, 7, delta),
      );
      reticle.quaternion.copy(camera.quaternion);
      /* A slow breath keeps the marker findable without animating the data. */
      const scale = 1.5 + Math.sin(elapsed * 2.1) * 0.06;
      reticle.scale.setScalar(scale);
    },

    setColor(next) {
      material.color.set(next);
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/**
 * A ground plane that snaps along with the camera, so it reads as continuous
 * terrain rather than a finite tile the viewer can fly off the edge of.
 */
export function createGrid({ color = 0xffffff, y = -22 } = {}) {
  const points = [];
  const halfWidth = GRID_HALF_WIDTH * GRID_SPACING;
  const depth = GRID_DEPTH * GRID_SPACING;

  for (let i = -GRID_HALF_WIDTH; i <= GRID_HALF_WIDTH; i += 1) {
    const x = i * GRID_SPACING;
    points.push(x, 0, 0, x, 0, -depth);
  }
  for (let i = 0; i <= GRID_DEPTH; i += 1) {
    const z = -i * GRID_SPACING;
    points.push(-halfWidth, 0, z, halfWidth, 0, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
  });

  const grid = new THREE.LineSegments(geometry, material);
  grid.position.y = y;
  grid.frustumCulled = false;
  grid.renderOrder = -2;

  return {
    object: grid,

    update(cameraZ) {
      /* Snap to the cell size: the grid slides in whole cells, so the lines
         never appear to crawl relative to the world. */
      grid.position.z = Math.ceil(cameraZ / GRID_SPACING) * GRID_SPACING;
    },

    setOpacity(value) {
      material.opacity = value;
    },

    setColor(next) {
      material.color.set(next);
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
