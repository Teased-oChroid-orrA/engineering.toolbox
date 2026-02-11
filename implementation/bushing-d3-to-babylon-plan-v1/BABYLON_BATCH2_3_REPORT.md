# Babylon Migration Batch 2 + 3 Report

Date: 2026-02-11

## Gate Status

### Batch 2 (BAB-011..BAB-020)
- BAB-011 Render parity harness: completed.
  - Added `src/lib/drafting/bushing/BushingBabylonParity.ts`.
  - Added `tests/bushing-babylon-parity.spec.ts`.
- BAB-012 Countersink parity checks: completed.
  - Internal/external countersink parity assertions included in `tests/bushing-babylon-parity.spec.ts`.
- BAB-013 Interaction controls: completed.
  - Added Babylon viewport controls (`+`, `-`, `Reset`) in `src/lib/drafting/bushing/BushingBabylonCanvas.svelte` and runtime methods in `src/lib/drafting/bushing/BushingBabylonRuntime.ts`.
- BAB-014 Performance instrumentation/budget checkpoint: completed.
  - Validated throughput/stress with `verify:bushing-ui-throughput` and repeated `verify:bushing-render-stress` soak loop.
- BAB-015 Export strategy ADR: completed.
  - Added `implementation/bushing-d3-to-babylon-plan-v1/ADR_BAB_015_EXPORT_SOURCE_OF_TRUTH.md`.
- BAB-016 Export compatibility: completed.
  - Added `tests/bushing-export-babylon-compat.spec.ts`.
- BAB-017 Renderer selector hardening: completed.
  - Added Babylon init fallback to SVG + persisted fallback in `src/lib/components/bushing/BushingOrchestrator.svelte`.
- BAB-018 Visual baseline extension: completed.
  - Added Babylon parity checks and refreshed visual snapshots after deterministic path serialization update.
- BAB-019 Regression dual-path integration: completed.
  - Added `verify:bushing-babylon-parity` and `verify:bushing-export-babylon-compat` into `verify:bushing-regression`.
- BAB-020 Batch validation (flagged behaviors): completed.
  - Added smoke checks for Babylon toggle + forced SVG fallback in `tests/bushing-e2e-smoke-ui.spec.ts`.

### Batch 3 (BAB-021..BAB-030)
- BAB-021 Babylon default switch: completed.
  - `draftEngine` now defaults to Babylon in `src/lib/components/bushing/BushingOrchestrator.svelte`.
- BAB-022 Explicit SVG fallback retained: completed.
  - Fallback via toggle/localStorage and auto-fallback on Babylon init failure.
- BAB-023 Remove D3 from active bushing section path: completed.
  - Replaced `d3.path` usage in `src/lib/drafting/bushing/sectionProfile.ts`.
  - Replaced `d3.path` usage in `src/lib/drafting/core/d3Primitives.ts` (now local deterministic path builder).
- BAB-024 Remove obsolete `d3BushingFigure*` modules: completed.
  - Removed:
    - `src/lib/drafting/bushing/d3BushingFigure.ts`
    - `src/lib/drafting/bushing/d3BushingFigureModel.ts`
    - `src/lib/drafting/bushing/d3BushingFigureRenderer.ts`
    - `src/lib/drafting/bushing/d3BushingFigureAnnotations.ts`
  - Updated bushing architecture manifest to Babylon modules.
- BAB-025 Global `d3` dependency cleanup: blocked (non-bushing dependency).
  - `d3` is still imported by non-bushing modules:
    - `src/lib/components/ProfileToolbox.svelte`
    - `src/lib/components/surface/SurfaceOrchestrator.svelte`
    - `src/lib/components/surface/controllers/SurfaceViewportMountController.ts`
  - Removing `d3` now would break Surface/Profile toolchains.
- BAB-026 Bundle/perf verification: completed.
  - Production build completed and artifact sizes recorded.
  - Throughput and stress checks passed.
- BAB-027 Documentation update: completed.
  - Added ADR and this batch report.
- BAB-028 Renderer failure telemetry hooks: completed.
  - Added persisted failure counters + structured console warning on init fail.
- BAB-029 Stabilization soak: completed.
  - Repeated `verify:bushing-render-stress` soak loop (3 consecutive passes).
- BAB-030 Final migration closeout (bushing scope): completed with caveat.
  - Bushing migration gates complete and regression green.
  - Caveat: BAB-025 remains cross-tool blocked until Surface/Profile drop `d3`.

## Validation Summary
- `npx svelte-check --tsconfig ./tsconfig.json`: pass
- `npm run -s verify:bushing-e2e-smoke`: pass
- `npm run -s verify:bushing-regression`: pass
- `npm run -s build`: pass
