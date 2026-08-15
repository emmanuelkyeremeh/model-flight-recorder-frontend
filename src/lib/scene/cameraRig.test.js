import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createCameraRig } from "./cameraRig.js";

function pointer(type, { id = 1, x = 0, y = 0, buttons = 1, button = 0 } = {}) {
  /* jsdom has no PointerEvent, and the rig only reads these five fields. */
  const event = new Event(type, { bubbles: true });
  Object.assign(event, {
    pointerId: id,
    pointerType: "mouse",
    clientX: x,
    clientY: y,
    buttons,
    button,
  });
  return event;
}

/** jsdom has no canvas, and the rig only needs somewhere to attach listeners. */
function harness() {
  const camera = new THREE.PerspectiveCamera(52, 1, 0.5, 1400);
  const element = document.createElement("div");
  document.body.appendChild(element);
  const rig = createCameraRig(camera, element);

  return {
    rig,
    camera,
    element,
    settle(seconds = 3) {
      for (let frame = 0; frame < seconds * 60; frame += 1) {
        rig.update(1 / 60, frame / 60);
      }
    },
    distanceFrom(point = { x: 0, y: 0, z: 0 }) {
      return camera.position.distanceTo(new THREE.Vector3(point.x, point.y, point.z));
    },
  };
}

describe("createCameraRig dragging", () => {
  it("ignores a moving cursor when no button is down", () => {
    const { rig, element, camera, settle } = harness();
    rig.lookAt({ x: 0, y: 0, z: 0 }, { distance: 40 });
    rig.level();
    settle();
    const parked = camera.position.clone();

    element.dispatchEvent(pointer("pointermove", { x: 100, y: 60, buttons: 0 }));
    element.dispatchEvent(pointer("pointermove", { x: 300, y: 200, buttons: 0 }));
    settle();

    expect(rig.dragging).toBe(false);
    expect(camera.position.distanceTo(parked)).toBeLessThan(0.001);
  });

  it("orbits only while the button is held", () => {
    const { rig, element, camera, settle } = harness();
    rig.lookAt({ x: 0, y: 0, z: 0 }, { distance: 40 });
    rig.level();
    settle();
    const parked = camera.position.clone();

    element.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    expect(rig.dragging).toBe(true);
    element.dispatchEvent(pointer("pointermove", { x: 180, y: 100 }));
    settle();
    const dragged = camera.position.clone();
    expect(dragged.distanceTo(parked)).toBeGreaterThan(1);

    element.dispatchEvent(pointer("pointerup", { x: 180, y: 100, buttons: 0 }));
    expect(rig.dragging).toBe(false);

    element.dispatchEvent(pointer("pointermove", { x: 600, y: 400, buttons: 0 }));
    settle();
    expect(camera.position.distanceTo(dragged)).toBeLessThan(0.001);
  });

  it("stops dragging when the release happens off the canvas", () => {
    const { rig, element } = harness();

    element.dispatchEvent(pointer("pointerdown", { x: 40, y: 40 }));
    expect(rig.dragging).toBe(true);

    /* Released over a floating panel, so only the window hears about it. */
    window.dispatchEvent(pointer("pointerup", { x: 900, y: 900, buttons: 0 }));
    expect(rig.dragging).toBe(false);
  });

  it("leaves the camera to the context menu on a right-click drag", () => {
    const { rig, element } = harness();

    element.dispatchEvent(pointer("pointerdown", { x: 40, y: 40, button: 2, buttons: 2 }));

    expect(rig.dragging).toBe(false);
  });
});

describe("createCameraRig travel vs focus", () => {
  it("travels to a new subject without changing how close you are", () => {
    /* Scrubbing the transport calls lookAt with no distance: the camera should
       glide onto the token but keep the reading distance the user had. */
    const { rig, settle, distanceFrom } = harness();
    rig.lookAt({ x: 0, y: 0, z: 0 }, { distance: 40 });
    settle();

    rig.lookAt({ x: 0, y: 0, z: -60 });
    settle();

    expect(distanceFrom({ x: 0, y: 0, z: -60 })).toBeCloseTo(40, 0);
  });

  it("pulls in close when a subject is framed deliberately", () => {
    /* Clicking a node, or Follow, passes a distance: that one snaps the camera in. */
    const { rig, settle, distanceFrom } = harness();
    rig.lookAt({ x: 0, y: 0, z: 0 }, { distance: 40 });
    settle();

    rig.lookAt({ x: 0, y: 0, z: -60 }, { distance: 16 });
    settle();

    expect(distanceFrom({ x: 0, y: 0, z: -60 })).toBeCloseTo(16, 0);
  });
});

describe("createCameraRig", () => {
  it("brings the camera closer on zoom in and further on zoom out", () => {
    const { rig, settle, distanceFrom } = harness();
    rig.lookAt({ x: 0, y: 0, z: 0 }, { distance: 40 });
    settle();
    const start = distanceFrom();

    rig.zoomBy(0.5);
    settle();
    const closer = distanceFrom();

    rig.zoomBy(4);
    settle();

    expect(closer).toBeLessThan(start);
    expect(distanceFrom()).toBeGreaterThan(closer);
  });

  it("refuses to zoom past its limits, so the field can never be lost", () => {
    const { rig, settle, distanceFrom } = harness();
    rig.lookAt({ x: 0, y: 0, z: 0 });

    for (let press = 0; press < 60; press += 1) {
      rig.zoomBy(0.5);
    }
    settle();
    expect(distanceFrom()).toBeGreaterThan(1);

    for (let press = 0; press < 60; press += 1) {
      rig.zoomBy(2);
    }
    settle();
    expect(distanceFrom()).toBeLessThan(260);
  });

  it("tilts toward the top of the scene without tumbling over it", () => {
    const { rig, camera, settle } = harness();
    rig.lookAt({ x: 0, y: 0, z: 0 }, { distance: 40 });
    settle();
    const level = camera.position.y;

    /* Far more than a quarter turn, so the clamp is what stops the tilt. */
    for (let press = 0; press < 40; press += 1) {
      rig.orbitBy(0, -Math.PI / 18);
    }
    settle();

    expect(camera.position.y).toBeGreaterThan(level);
    expect(camera.position.y).toBeLessThan(40);
  });

  it("returns to the default attitude while keeping the subject and distance", () => {
    const { rig, camera, settle, distanceFrom } = harness();
    const subject = { x: 0, y: 4, z: -30 };
    rig.lookAt(subject, { distance: 20 });

    rig.orbitBy(1.2, 0.4);
    settle();
    rig.level();
    settle();

    expect(distanceFrom(subject)).toBeCloseTo(20, 1);
    expect(camera.position.y).toBeCloseTo(4 + 20 * Math.cos(Math.PI * 0.46), 1);
  });
});
