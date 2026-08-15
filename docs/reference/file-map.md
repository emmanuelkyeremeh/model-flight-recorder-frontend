# File map

```
frontend/
├── index.html
├── package.json
├── vite.config.js              # @shared → src/shared, worker format es
├── public/
│   ├── favicon.svg
│   └── logo.svg
├── docs/                       # this Sphinx site
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.test.jsx
    ├── index.css
    ├── webllm.worker.js
    ├── hooks/
    │   ├── useRecorder.js
    │   └── useTheme.js
    ├── components/
    │   ├── AnalyticsPanel.jsx
    │   ├── BrandMark.jsx
    │   ├── Chart.jsx
    │   ├── ContactSheet.jsx
    │   ├── DetailRail.jsx
    │   ├── DetailRail.test.jsx
    │   ├── Findings.jsx
    │   ├── FlightBrief.jsx
    │   ├── FlightScene.jsx
    │   ├── InfoButton.jsx
    │   ├── PromptDock.jsx
    │   ├── ReadingPanel.jsx
    │   ├── RunHeader.jsx
    │   ├── SceneControls.jsx
    │   ├── ThemeToggle.jsx
    │   ├── TokenInspector.jsx
    │   ├── TokenStream.jsx
    │   ├── TopBar.jsx
    │   └── Transport.jsx
    ├── lib/
    │   ├── analyzeFlight.js
    │   ├── catalog.js
    │   ├── charts.js
    │   ├── corridor.js
    │   ├── demoRun.js              # used by corridor tests only
    │   ├── download.js
    │   ├── flightRecord.js
    │   ├── phases.js
    │   ├── receipt.js
    │   ├── telemetry.js
    │   ├── theme.js
    │   ├── transfer.js
    │   ├── webgpu.js
    │   ├── engine/
    │   │   ├── createEngine.js
    │   │   ├── mockEngine.js
    │   │   └── webllmEngine.js
    │   └── scene/
    │       ├── cameraRig.js
    │       ├── damp.js
    │       ├── flightScene.js
    │       ├── instruments.js
    │       ├── routeLayer.js
    │       └── vocabularyField.js
    ├── shared/
    │   └── receiptSchema.js
    └── test/
        └── canvasStub.js
```

Dead UI from earlier redesigns (`BenchStation`, `ConsentGate`, `ModelPicker`,
`PromptComposer`) has been removed. If you find an import pointing at one of
those, it is stale.
