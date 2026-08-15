import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildCorridor } from "../corridor.js";
import { createRouteLayer } from "./routeLayer.js";

const WIDTH = 1200;
const HEIGHT = 800;

function frame(index, text, prob, alternatives) {
  return {
    index,
    text,
    prob,
    delayMs: 20,
    logprob: Math.log(prob),
    alternatives,
  };
}

/** A camera looking straight down the corridor, so screen maths is predictable. */
function scene() {
  const corridor = buildCorridor([
    /* The engine reported only the winner here, so this step has no ring. */
    frame(0, "Flight", 0.9, [{ token: "Flight", logprob: Math.log(0.9) }]),
    frame(1, " strip", 0.4, [
      { token: " strip", logprob: Math.log(0.4) },
      { token: " deck", logprob: Math.log(0.32) },
      { token: " plan", logprob: Math.log(0.12) },
    ]),
  ]);
  const camera = new THREE.PerspectiveCamera(52, WIDTH / HEIGHT, 0.5, 1400);
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, -12);
  camera.updateMatrixWorld(true);

  const route = createRouteLayer();
  route.sync(corridor);
  return { corridor, camera, route };
}

function screenPositionOf(camera, position) {
  const projected = new THREE.Vector3(position.x, position.y, position.z).project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * WIDTH,
    y: (-projected.y * 0.5 + 0.5) * HEIGHT,
  };
}

describe("route picking", () => {
  it("selects the sampled token nearest the click", () => {
    const { corridor, camera, route } = scene();
    const target = corridor.waypoints[1];
    const at = screenPositionOf(camera, target.position);

    const hit = route.pick({ camera, ...at, width: WIDTH, height: HEIGHT });

    expect(hit).toMatchObject({ frameIndex: 1, kind: "sampled" });
  });

  it("forgives a near miss, because these nodes are a few pixels across", () => {
    const { corridor, camera, route } = scene();
    const at = screenPositionOf(camera, corridor.waypoints[0].position);

    const hit = route.pick({
      camera,
      x: at.x + 9,
      y: at.y - 9,
      width: WIDTH,
      height: HEIGHT,
    });

    expect(hit?.frameIndex).toBe(0);
  });

  it("reports nothing when the click lands on empty space", () => {
    const { camera, route } = scene();

    const hit = route.pick({ camera, x: 40, y: 40, width: WIDTH, height: HEIGHT });

    expect(hit).toBeNull();
  });

  it("names the rejected candidate when its own node is clicked", () => {
    const { corridor, camera, route } = scene();
    const candidate = corridor.alternates.find((entry) => entry.frameIndex === 1);
    const at = screenPositionOf(camera, candidate.position);

    const hit = route.pick({ camera, ...at, width: WIDTH, height: HEIGHT });

    expect(hit).toMatchObject({
      frameIndex: 1,
      kind: "candidate",
      token: candidate.token,
    });
  });

  it("prefers the sampled token when a candidate sits on top of it", () => {
    const { corridor, camera, route } = scene();
    const at = screenPositionOf(camera, corridor.waypoints[1].position);

    /* Ties go to the route, since that is the node the line passes through. */
    const hit = route.pick({ camera, ...at, width: WIDTH, height: HEIGHT });

    expect(hit.kind).toBe("sampled");
  });

  it("only reports the candidates it recorded for a step", () => {
    const { route } = scene();

    expect(route.candidatesAt(0).map((entry) => entry.token)).toEqual([]);
    expect(route.candidatesAt(1).map((entry) => entry.token)).toEqual([" deck", " plan"]);
  });
});

describe("route palette", () => {
  const PAPER = Object.freeze({
    ink: 0x0e7490,
    uncertain: 0x92400e,
    dim: 0x94a3b8,
    accent: 0x0f172a,
  });

  it("re-tints a route that is already on screen, selection included", () => {
    const { route } = scene();
    route.highlight(1);
    const tinted = route.object.children.filter((child) => child.instanceColor);
    const before = tinted.map((mesh) => Array.from(mesh.instanceColor.array));

    route.setPalette(PAPER);

    const after = tinted.map((mesh) => Array.from(mesh.instanceColor.array));
    expect(after).not.toEqual(before);
  });

  it("survives a theme flip before anything has been recorded", () => {
    const route = createRouteLayer();

    expect(() => route.setPalette(PAPER)).not.toThrow();
  });
});
