# Bushing D3 -> Babylon Migration Gated Plan (V1)

## Current Baseline (as of 2026-02-11)
- Active Bushing renderer is SVG section rendering (`BushingDrafting.svelte` + `bushingSceneRenderer.ts`).
- Direct D3 usage in Bushing path is currently limited to SVG path generation in `/Users/nautilus/Desktop/StructuralCompanionDesktop/src/lib/drafting/bushing/sectionProfile.ts`.
- Legacy D3 figure modules still exist under `/Users/nautilus/Desktop/StructuralCompanionDesktop/src/lib/drafting/bushing/d3BushingFigure*.ts`.

## Execution Rule
- Execute in batches of 10 gates.
- Do not start the next batch until the current batch exit criteria pass.
- Keep `verify:bushing-regression` green at every batch boundary.

## Batch 1 (Gates 1-10): Architecture + Parallel Babylon Renderer (No Behavior Change)

### Gate 1 (BAB-001): Renderer contract freeze
- Ticket: define stable scene contract consumed by any renderer.
- Files: `src/lib/drafting/bushing/bushingSceneModel.ts`, docs.
- Exit criteria: no contract drift in existing tests.

### Gate 2 (BAB-002): Renderer adapter interface
- Ticket: add renderer adapter (`render(scene, viewport, mode)` + diagnostics).
- Exit criteria: current SVG renderer compiles via adapter.

### Gate 3 (BAB-003): Feature flag plumbing
- Ticket: add `draftRenderer = svg|babylon` setting in Bushing state/localStorage.
- Exit criteria: toggling renderer does not break existing SVG flow.

### Gate 4 (BAB-004): Babylon dependency bootstrap
- Ticket: add Babylon packages and loader guard.
- Exit criteria: build succeeds with Babylon installed but not active by default.

### Gate 5 (BAB-005): Babylon canvas host component
- Ticket: create `BushingBabylonCanvas.svelte` with safe mount/unmount lifecycle.
- Exit criteria: no leaks on route change/toggle.

### Gate 6 (BAB-006): Camera + lighting baseline
- Ticket: deterministic orthographic/isometric camera and neutral lighting profile.
- Exit criteria: stable framing for all three profile modes.

### Gate 7 (BAB-007): Mesh builder from scene loops
- Ticket: convert section loops/regions into Babylon meshes.
- Exit criteria: straight/flanged/countersink all render geometry.

### Gate 8 (BAB-008): Material mapping
- Ticket: map housing/bushing/void semantics to Babylon materials.
- Exit criteria: visual distinction preserved vs SVG semantic layers.

### Gate 9 (BAB-009): Diagnostics parity hooks
- Ticket: expose diagnostics from Babylon renderer (topology/visibility warnings).
- Exit criteria: existing diagnostic UI still populated.

### Gate 10 (BAB-010): Batch 1 validation
- Run: `npm run -s verify:bushing-architecture && npm run -s verify:bushing-regression`.
- Exit criteria: full pass with SVG default and Babylon behind flag.

## Batch 2 (Gates 11-20): Parity, Interaction, and Export Compatibility

### Gate 11 (BAB-011): Render parity harness
- Ticket: add test harness comparing key geometry signatures (bbox, centroids, key edges) between SVG and Babylon.
- Exit criteria: deterministic parity thresholds documented.

### Gate 12 (BAB-012): Countersink visualization parity
- Ticket: verify internal/external countersink modes produce equivalent geometry cues.
- Exit criteria: no mismatch in derived dimensions from UI edits.

### Gate 13 (BAB-013): Interaction controls
- Ticket: pan/zoom/reset camera controls matching existing UX expectations.
- Exit criteria: controls work without interfering with input cards.

### Gate 14 (BAB-014): Performance budget instrumentation
- Ticket: instrument frame time + update latency for parameter edits.
- Exit criteria: performance budget defined and measured in CI-friendly check.

### Gate 15 (BAB-015): Export strategy decision
- Ticket: choose export source of truth (SVG pipeline retained or Babylon snapshot path).
- Exit criteria: documented architecture decision record.

### Gate 16 (BAB-016): Export compatibility implementation
- Ticket: keep `Export SVG/PDF` behavior intact with Babylon active.
- Exit criteria: `verify:bushing-smoke` export checks remain green.

### Gate 17 (BAB-017): UI renderer selector hardening
- Ticket: user-facing renderer toggle text/tooltips and fallback behavior.
- Exit criteria: failed Babylon init auto-falls back to SVG.

### Gate 18 (BAB-018): Visual baseline extension
- Ticket: add Babylon-target snapshots/semantic assertions.
- Exit criteria: baseline tests deterministic in CI.

### Gate 19 (BAB-019): Regression package update
- Ticket: integrate Babylon checks into `verify:bushing-regression` (flagged phase).
- Exit criteria: regression job covers both renderers.

### Gate 20 (BAB-020): Batch 2 validation
- Run full bushing regression with Babylon flag on/off.
- Exit criteria: pass both permutations.

## Batch 3 (Gates 21-30): Default Switch + D3 Retirement

### Gate 21 (BAB-021): Babylon default in non-legacy path
- Ticket: switch default renderer to Babylon.
- Exit criteria: smoke/e2e pass with default config.

### Gate 22 (BAB-022): Legacy/SVG fallback retained
- Ticket: keep SVG as explicit fallback during rollout window.
- Exit criteria: fallback can be forced via setting.

### Gate 23 (BAB-023): Remove D3 from section path builder
- Ticket: replace `d3.path()` use with internal lightweight path utility.
- File: `src/lib/drafting/bushing/sectionProfile.ts`.
- Exit criteria: no D3 import on active section path.

### Gate 24 (BAB-024): Remove obsolete d3BushingFigure modules
- Ticket: delete or archive unused legacy D3 figure modules.
- Exit criteria: no runtime imports to `d3BushingFigure*`.

### Gate 25 (BAB-025): Dependency cleanup
- Ticket: remove `d3` dependency if unused globally.
- Exit criteria: lockfile/build/test pass with no d3 usage.

### Gate 26 (BAB-026): Bundle/perf verification
- Ticket: compare bundle size and startup/render timings before/after.
- Exit criteria: no unacceptable regression vs approved budget.

### Gate 27 (BAB-027): Documentation update
- Ticket: update architecture docs, troubleshooting, and renderer behavior notes.
- Exit criteria: docs include fallback and known limitations.

### Gate 28 (BAB-028): Release guardrails
- Ticket: add runtime telemetry hooks for renderer init failures.
- Exit criteria: failure class visible in diagnostics/logs.

### Gate 29 (BAB-029): Stabilization soak
- Ticket: run extended regression/stress cycles over representative datasets.
- Exit criteria: no new high-severity defects.

### Gate 30 (BAB-030): Final cutover closeout
- Ticket: remove temporary feature flags and mark migration complete.
- Exit criteria: `verify:bushing-regression` + file-size policy + release checks pass.

## Risks and Controls
- Risk: Babylon introduces rendering nondeterminism in CI.
- Control: lock camera/projection/precision and snapshot canonicalization.

- Risk: Export behavior drifts from current SVG contract.
- Control: keep SVG export pipeline as source-of-truth until BAB-016 is complete.

- Risk: Increased complexity in orchestration state.
- Control: adapter layer with renderer-specific modules only.

## Suggested Batch Order for Immediate Execution
1. Run Batch 1 (BAB-001..BAB-010).
2. Hold at Gate 10 until full bushing regression is green.
3. Start Batch 2 only after parity harness is in place.
