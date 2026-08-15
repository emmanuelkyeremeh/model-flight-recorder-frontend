# Run locally

## Requirements

- Node 20+ (ESM throughout)
- A WebGPU browser: Chrome 113+, Edge 113+, Safari 26+
- Roughly 400 MB free VRAM for the default model; more for the stress subjects

## Install and start

```bash
git clone git@github.com:emmanuelkyeremeh/model-flight-recorder-frontend.git
cd model-flight-recorder-frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## First run

1. Leave the default model (SmolLM2 360M, ~204 MB).
2. Click **Download & load**. Watch the field brighten as weights arrive.
3. Wait for the phase word to read **READY**.
4. Click **Run**. The camera follows the newest token while it streams.
5. When the phase reads **COMPLETE**, scrub the timeline, click nodes, or hit
   the finding chips. Open **Analytics** for the forensic surface.

## Query flags

| Flag | Use |
| --- | --- |
| `?engine=mock` | Deterministic fake engine. No WebGPU, no download. Used by tests. |
| `?probe=1` | Preserve the drawing buffer. Exposes `window.__flightProbe`. |

### Driving the scene without rAF

Some embedded browsers throttle or skip `requestAnimationFrame`. With
`?probe=1`:

```js
window.__flightProbe.step(60);          // advance 60 frames at 1/60 s each
window.__flightProbe.stats();           // draw calls, points, waypoints, cameraZ
window.__flightProbe.labels();          // currently visible label texts
window.__flightProbe.pick(x, y);        // canvas-relative screen-space pick
```

## Tests and build

```bash
npm test
npm run build
npm run preview
```

## Pairing with the backend

Optional. In a second terminal:

```bash
git clone git@github.com:emmanuelkyeremeh/model-flight-recorder-backend.git
cd model-flight-recorder-backend
npm start
```

Listens on `http://127.0.0.1:8787`. See {doc}`../reference/backend`.

## Memory notes (16 GB Mac)

- Prefer the default SmolLM2 subject.
- Close other GPU-heavy tabs before loading Llama 3.2 1B or Qwen 1.5B.
- During inference the scene drops pixel ratio and field drift automatically
  (`setBusy`) so WebGL and WebGPU do not fight over unified memory.
