import * as THREE from "three";

/**
 * The recorded route: the tokens it sampled, the ones it nearly sampled, and
 * the haze of its uncertainty at each step.
 *
 * Every mesh here is allocated once at full capacity and drawn with a moving
 * `count`. A token arriving mid-run writes a handful of matrices and nothing
 * else — no geometry is rebuilt, so the scene never blinks.
 */

const MAX_WAYPOINTS = 512;
const ALTERNATES_PER_WAYPOINT = 4;
const UP = new THREE.Vector3(0, 1, 0);

const HALO_VERTEX = /* glsl */ `
  uniform float uPixelRatio;
  attribute float aRadius;
  varying float vAlpha;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = (aRadius * uPixelRatio * 96.0) / max(1.0, depth);
    /* Low edge first: smoothstep is undefined when edge0 >= edge1. */
    vAlpha = (1.0 - smoothstep(30.0, 520.0, depth)) * 0.5;
  }
`;

const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) {
      discard;
    }
    /* A wide, soft falloff reads as glow without a post-processing pass. */
    float glow = pow(1.0 - dist * 2.0, 2.4);
    gl_FragColor = vec4(uColor, glow * vAlpha);
  }
`;

function orientSegment(matrix, from, to, radius, scratch) {
  const direction = scratch.direction.subVectors(to, from);
  const length = Math.max(0.0001, direction.length());
  const midpoint = scratch.midpoint.addVectors(from, to).multiplyScalar(0.5);
  const quaternion = scratch.quaternion.setFromUnitVectors(UP, direction.normalize());
  matrix.compose(midpoint, quaternion, scratch.scale.set(radius, length, radius));
}

export function createRouteLayer({
  ink = 0x86d8f5,
  uncertain = 0xdbe978,
  dim = 0x346f89,
  accent = 0xeffbff,
} = {}) {
  const group = new THREE.Group();
  const scratch = {
    direction: new THREE.Vector3(),
    midpoint: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    position: new THREE.Vector3(),
    identity: new THREE.Quaternion(),
    matrix: new THREE.Matrix4(),
    color: new THREE.Color(),
    projected: new THREE.Vector3(),
  };

  const routeMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 6, 1, true),
    new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.92 }),
    MAX_WAYPOINTS,
  );
  routeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  routeMesh.count = 0;
  routeMesh.frustumCulled = false;

  const waypointMesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(1, 0),
    new THREE.MeshBasicMaterial({ color: ink }),
    MAX_WAYPOINTS,
  );
  waypointMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  waypointMesh.count = 0;
  waypointMesh.frustumCulled = false;

  /* Rejected candidates are measurements too, so they are lit well enough to
     read as objects. Instance colour carries the emphasis: the step you have
     selected brightens, the rest stay quiet without disappearing. */
  const alternateMesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(1, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 }),
    MAX_WAYPOINTS * ALTERNATES_PER_WAYPOINT,
  );
  alternateMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  alternateMesh.count = 0;
  alternateMesh.frustumCulled = false;

  const spokeMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 4, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34 }),
    MAX_WAYPOINTS * ALTERNATES_PER_WAYPOINT,
  );
  spokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  spokeMesh.count = 0;
  spokeMesh.frustumCulled = false;

  const haloPositions = new Float32Array(MAX_WAYPOINTS * 3);
  const haloRadii = new Float32Array(MAX_WAYPOINTS);
  const haloGeometry = new THREE.BufferGeometry();
  haloGeometry.setAttribute("position", new THREE.BufferAttribute(haloPositions, 3));
  haloGeometry.setAttribute("aRadius", new THREE.BufferAttribute(haloRadii, 1));
  haloGeometry.setDrawRange(0, 0);
  haloGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

  const haloUniforms = {
    uPixelRatio: { value: 1 },
    uColor: { value: new THREE.Color(accent) },
  };
  const haloPoints = new THREE.Points(
    haloGeometry,
    new THREE.ShaderMaterial({
      uniforms: haloUniforms,
      vertexShader: HALO_VERTEX,
      fragmentShader: HALO_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  haloPoints.frustumCulled = false;

  group.add(haloPoints, spokeMesh, alternateMesh, routeMesh, waypointMesh);

  let waypoints = [];
  /* Alternates in instance order, so a pick or a highlight can find its way
     back from an instance index to the candidate it represents. */
  let packed = [];
  let drawn = 0;
  let selectedFrame = -1;
  let lastCorridor = null;
  let accentTone = accent;
  const confidentColor = new THREE.Color(ink);
  const uncertainColor = new THREE.Color(uncertain);
  const restingCandidate = new THREE.Color(dim);
  const liveCandidate = new THREE.Color(uncertain);

  function colorFor(point) {
    const certainty = THREE.MathUtils.clamp(point.prob ?? 0.5, 0, 1);
    return scratch.color.lerpColors(uncertainColor, confidentColor, certainty);
  }

  /** Candidate emphasis, and the matching size, for one alternate. */
  function candidateWeight(alternate) {
    return alternate.frameIndex === selectedFrame ? 1 : 0;
  }

  /** Writes sampled-token instances for waypoints [from, to). */
  function writeWaypoints(corridor, from, to) {
    const limit = Math.min(to, MAX_WAYPOINTS);

    for (let i = from; i < limit; i += 1) {
      const point = corridor.waypoints[i];
      const { position } = point;

      scratch.position.set(position.x, position.y, position.z);
      const size = 0.20 + Math.sqrt(Math.max(0.02, point.prob ?? 0.3)) * 0.46;
      scratch.matrix.compose(
        scratch.position,
        scratch.identity,
        scratch.scale.set(size, size, size),
      );
      waypointMesh.setMatrixAt(i, scratch.matrix);
      waypointMesh.setColorAt(i, colorFor(point));

      haloPositions[i * 3] = position.x;
      haloPositions[i * 3 + 1] = position.y;
      haloPositions[i * 3 + 2] = position.z;
      haloRadii[i] = point.halo;

      const previous = i === 0
        ? { x: position.x, y: position.y, z: position.z + 2.4 }
        : corridor.waypoints[i - 1].position;
      scratch.from.set(previous.x, previous.y, previous.z);
      scratch.to.copy(scratch.position);
      orientSegment(scratch.matrix, scratch.from, scratch.to, 0.075, scratch);
      routeMesh.setMatrixAt(i, scratch.matrix);
      routeMesh.setColorAt(i, colorFor(point));
    }
  }

  /**
   * Steps report a variable number of candidates, so alternates get a single
   * packed rewrite rather than a per-waypoint slot that would drift out of step.
   */
  /** Writes one packed alternate, sized and coloured for the current selection. */
  function writeAlternate(cursor, alternate) {
    const emphasis = candidateWeight(alternate);
    const anchor = alternate.anchor;

    scratch.position.set(alternate.position.x, alternate.position.y, alternate.position.z);
    const base = 0.11 + Math.sqrt(Math.max(0.01, alternate.prob ?? 0.05)) * 0.3;
    const size = base * (1 + emphasis * 0.75);
    scratch.matrix.compose(
      scratch.position,
      scratch.identity,
      scratch.scale.set(size, size, size),
    );
    alternateMesh.setMatrixAt(cursor, scratch.matrix);
    alternateMesh.setColorAt(
      cursor,
      scratch.color.lerpColors(restingCandidate, liveCandidate, emphasis),
    );

    scratch.from.set(anchor.x, anchor.y, anchor.z);
    scratch.to.copy(scratch.position);
    orientSegment(scratch.matrix, scratch.from, scratch.to, 0.02 + emphasis * 0.02, scratch);
    spokeMesh.setMatrixAt(cursor, scratch.matrix);
    spokeMesh.setColorAt(
      cursor,
      scratch.color.lerpColors(restingCandidate, liveCandidate, emphasis),
    );
  }

  function writeAlternates(corridor, limit) {
    const capacity = MAX_WAYPOINTS * ALTERNATES_PER_WAYPOINT;
    packed = [];

    for (const alternate of corridor.alternates) {
      if (packed.length >= capacity || alternate.frameIndex >= limit) {
        continue;
      }
      /* Carrying the anchor keeps a later re-emphasis from needing the corridor. */
      packed.push({ ...alternate, anchor: corridor.waypoints[alternate.frameIndex].position });
      writeAlternate(packed.length - 1, packed[packed.length - 1]);
    }

    return packed.length;
  }

  /**
   * Marks the selection: the sampled token goes near-white, and the candidates
   * ringed around that one step brighten and grow so they read as the tokens
   * it weighed rather than as more of the background.
   */
  function highlight(frameIndex) {
    selectedFrame = frameIndex;

    if (waypointMesh.instanceColor) {
      for (let i = 0; i < drawn; i += 1) {
        if (waypoints[i]?.frameIndex === frameIndex) {
          scratch.color.set(accentTone);
        } else {
          colorFor(waypoints[i]);
        }
        waypointMesh.setColorAt(i, scratch.color);
      }
      waypointMesh.instanceColor.needsUpdate = true;
    }

    for (let cursor = 0; cursor < packed.length; cursor += 1) {
      writeAlternate(cursor, packed[cursor]);
    }
    alternateMesh.instanceMatrix.needsUpdate = true;
    spokeMesh.instanceMatrix.needsUpdate = true;
    if (alternateMesh.instanceColor) {
      alternateMesh.instanceColor.needsUpdate = true;
    }
    if (spokeMesh.instanceColor) {
      spokeMesh.instanceColor.needsUpdate = true;
    }
  }

  return {
    object: group,

    setPixelRatio(ratio) {
      haloUniforms.uPixelRatio.value = ratio;
    },

    /**
     * Theme swap: rewrite the colour ramps and re-tint everything already drawn
     * so flipping light/dark does not leave a darkroom route on paper, or vice
     * versa.
     */
    setPalette({ ink: nextInk, uncertain: nextUncertain, dim: nextDim, accent: nextAccent }) {
      accentTone = nextAccent;
      confidentColor.set(nextInk);
      uncertainColor.set(nextUncertain);
      restingCandidate.set(nextDim);
      liveCandidate.set(nextUncertain);
      haloUniforms.uColor.value.set(nextAccent);

      if (!lastCorridor || drawn === 0) {
        return;
      }
      writeWaypoints(lastCorridor, 0, drawn);
      for (let cursor = 0; cursor < packed.length; cursor += 1) {
        writeAlternate(cursor, packed[cursor]);
      }
      waypointMesh.instanceMatrix.needsUpdate = true;
      routeMesh.instanceMatrix.needsUpdate = true;
      alternateMesh.instanceMatrix.needsUpdate = true;
      spokeMesh.instanceMatrix.needsUpdate = true;
      for (const mesh of [waypointMesh, routeMesh, alternateMesh, spokeMesh]) {
        if (mesh.instanceColor) {
          mesh.instanceColor.needsUpdate = true;
        }
      }
      highlight(selectedFrame);
    },

    /**
     * Accepts the whole corridor every time but only uploads what changed, so a
     * 300-token run costs 300 small writes rather than 300 full rebuilds.
     */
    sync(corridor) {
      const next = Math.min(corridor.waypoints.length, MAX_WAYPOINTS);
      /* A corridor that did not grow means a new run started: rewrite from zero. */
      const from = next > drawn ? drawn : 0;

      writeWaypoints(corridor, from, next);
      const alternateCount = writeAlternates(corridor, next);

      waypointMesh.count = next;
      routeMesh.count = next;
      alternateMesh.count = alternateCount;
      spokeMesh.count = alternateCount;
      haloGeometry.setDrawRange(0, next);

      waypointMesh.instanceMatrix.needsUpdate = true;
      routeMesh.instanceMatrix.needsUpdate = true;
      alternateMesh.instanceMatrix.needsUpdate = true;
      spokeMesh.instanceMatrix.needsUpdate = true;
      haloGeometry.attributes.position.needsUpdate = true;
      haloGeometry.attributes.aRadius.needsUpdate = true;
      for (const mesh of [waypointMesh, routeMesh, alternateMesh, spokeMesh]) {
        if (mesh.instanceColor) {
          mesh.instanceColor.needsUpdate = true;
        }
      }

      waypoints = corridor.waypoints;
      drawn = next;
      lastCorridor = corridor;
    },

    highlight,

    /** The candidates this run recorded at one step, for labels and readouts. */
    candidatesAt(frameIndex) {
      return packed.filter((alternate) => alternate.frameIndex === frameIndex);
    },

    /**
     * Picking in screen space rather than by ray, because these nodes are a
     * fraction of a unit across: a ray demands the pixel, while a viewer aims
     * at the dot they can see. Sampled tokens win ties over the candidates
     * ringed around them, since that is the node the route runs through.
     */
    pick({ camera, x, y, width, height, radius = 20 }) {
      let best = null;
      let bestScore = radius;

      const consider = (entry, kind, bonus) => {
        scratch.projected
          .set(entry.position.x, entry.position.y, entry.position.z)
          .project(camera);
        if (scratch.projected.z > 1) {
          return;
        }
        const sx = (scratch.projected.x * 0.5 + 0.5) * width;
        const sy = (-scratch.projected.y * 0.5 + 0.5) * height;
        const score = Math.hypot(sx - x, sy - y) - bonus;
        if (score < bestScore) {
          bestScore = score;
          best = { frameIndex: entry.frameIndex, token: entry.token, kind };
        }
      };

      for (let i = 0; i < drawn; i += 1) {
        consider(waypoints[i], "sampled", 6);
      }
      for (const alternate of packed) {
        consider(alternate, "candidate", 0);
      }

      return best;
    },

    dispose() {
      for (const mesh of [routeMesh, waypointMesh, alternateMesh, spokeMesh, haloPoints]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}
