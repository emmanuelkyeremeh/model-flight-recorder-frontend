import * as THREE from "three";
import { damp } from "./damp.js";

/**
 * The field is one point per token in the model's vocabulary — the actual space
 * the model picks from, 49,152 wide on SmolLM2. It is the thing that makes the
 * scale of a single word choice legible.
 *
 * The whole field is one draw call. Points are wrapped around the camera in the
 * vertex shader, so a fixed budget of points yields a corridor of unlimited
 * depth that is always dense wherever the viewer happens to be.
 */

const SPAN = 180;
const RADIUS_INNER = 3;
const RADIUS_OUTER = 40;

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uCamZ;
  uniform float uHeadZ;
  uniform float uPulse;
  uniform float uReveal;
  uniform float uDrift;

  attribute float aSeed;
  attribute float aScale;

  varying float vAlpha;
  varying float vSeed;
  varying float vEnergy;

  void main() {
    vec3 p = position;

    /* Wrap depth into a window that travels with the camera. */
    float rel = mod(p.z - uCamZ + SPAN_AHEAD, SPAN_TOTAL);
    rel = rel < 0.0 ? rel + SPAN_TOTAL : rel;
    p.z = uCamZ + SPAN_AHEAD - rel;

    /* Drift, computed on the GPU so the CPU never touches the buffer. */
    float t = uTime * 0.08 + aSeed * 6.2831853;
    p.x += sin(t) * 1.15 * uDrift;
    p.y += cos(t * 0.83) * 1.15 * uDrift;

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    float depth = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
    /* Clamped: tens of thousands of additive sprites will white out the frame
       the moment a few of them are allowed to grow near the camera. */
    gl_PointSize = clamp(
      (uSize * aScale * uPixelRatio * 170.0) / max(1.0, depth),
      1.2,
      8.0
    );

    /* Near points would otherwise blow out; far points fade into the black.
       Both ramps are written low-edge-first: GLSL leaves smoothstep undefined
       when edge0 >= edge1, and a reversed pair returns driver garbage. */
    float far = 1.0 - smoothstep(25.0, SPAN_TOTAL * 0.85, depth);
    float near = smoothstep(0.0, 7.0, depth);

    /* Each sampled token sends a wave of light through the vocabulary. */
    float wave = (1.0 - smoothstep(0.0, 70.0, abs(p.z - uHeadZ))) * uPulse;

    vAlpha = far * near * (1.1 + wave * 1.5) * uReveal;
    vSeed = aSeed;
    vEnergy = wave;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColorDeep;
  uniform vec3 uColorCool;
  uniform vec3 uColorCommit;
  varying float vAlpha;
  varying float vSeed;
  varying float vEnergy;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = dot(uv, uv);
    if (dist > 0.25) {
      discard;
    }
    float soft = 1.0 - smoothstep(0.0, 0.25, dist);
    vec3 fieldColor = mix(uColorDeep, uColorCool, 0.2 + vSeed * 0.8);
    vec3 color = mix(fieldColor, uColorCommit, clamp(vEnergy, 0.0, 1.0));
    gl_FragColor = vec4(color, soft * vAlpha);
  }
`;

/**
 * Deterministic sampling so the same model always renders the same sky, and a
 * screenshot taken twice is the same screenshot.
 */
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createVocabularyField({
  count,
  deep = 0x1d6f91,
  cool = 0x86d8f5,
  commit = 0xdbe978,
}) {
  const total = Math.max(1, Math.floor(count));
  const positions = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  const scales = new Float32Array(total);
  const next = random(0x5f375a86);

  for (let i = 0; i < total; i += 1) {
    const angle = next() * Math.PI * 2;
    /* Square-root radial sampling keeps the density even across the disc
       instead of crowding the centre line the route has to stay readable in. */
    const radius = RADIUS_INNER
      + Math.sqrt(next()) * (RADIUS_OUTER - RADIUS_INNER);

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.66;
    positions[i * 3 + 2] = -next() * SPAN;
    seeds[i] = next();
    scales[i] = 0.4 + next() * next() * 1.9;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  /* The shader relocates every point, so an automatic bounding sphere would
     cull the field the moment the camera left the original volume. */
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

  const uniforms = {
    uTime: { value: 0 },
    uSize: { value: 1 },
    uPixelRatio: { value: 1 },
    uCamZ: { value: 0 },
    uHeadZ: { value: 0 },
    uPulse: { value: 0 },
    uReveal: { value: 0 },
    uDrift: { value: 1 },
    uColorDeep: { value: new THREE.Color(deep) },
    uColorCool: { value: new THREE.Color(cool) },
    uColorCommit: { value: new THREE.Color(commit) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX
      .replaceAll("SPAN_TOTAL", SPAN.toFixed(1))
      .replaceAll("SPAN_AHEAD", (SPAN * 0.16).toFixed(1)),
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -1;
  geometry.setDrawRange(0, total);

  let pulse = 0;
  let visible = total;
  let lit = false;

  return {
    object: points,
    capacity: total,

    /**
     * Switching models changes how many tokens exist to draw. That is a draw
     * range, not a reallocation — the buffer and the GL context stay put.
     */
    setVisibleCount(next) {
      visible = Math.max(1, Math.min(total, Math.floor(next)));
      geometry.setDrawRange(0, visible);
      return visible;
    },

    get visibleCount() {
      return visible;
    },

    /** Called when the model commits to a token. */
    strike() {
      pulse = 1;
    },

    setPixelRatio(ratio) {
      uniforms.uPixelRatio.value = ratio;
    },

    /** Ambient motion is the first thing to give up when the GPU is busy. */
    setDrift(scale) {
      uniforms.uDrift.value = scale;
    },

    /**
     * Light mode cannot use additive sprites on a pale clear colour — they wash
     * out. Switching the blend mode and the three field colours together keeps
     * the sea of neurons legible on paper as well as in the darkroom.
     */
    setPalette({ deep, cool, commit, additive }) {
      uniforms.uColorDeep.value.set(deep);
      uniforms.uColorCool.value.set(cool);
      uniforms.uColorCommit.value.set(commit);
      material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
    },

    update(delta, elapsed, { cameraZ, headZ, reveal }) {
      pulse = Math.max(0, pulse - delta * 1.8);
      uniforms.uTime.value = elapsed;
      uniforms.uCamZ.value = cameraZ;
      uniforms.uHeadZ.value = headZ;
      uniforms.uPulse.value = pulse;

      if (lit) {
        uniforms.uReveal.value = damp(uniforms.uReveal.value, reveal, 2.2, delta);
      } else {
        /* A throttled tab may only ever grant one frame. That frame has to be
           the finished picture, not the first step of a fade-in. */
        uniforms.uReveal.value = reveal;
        lit = true;
      }
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
