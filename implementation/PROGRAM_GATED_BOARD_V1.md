# Program Gated Board V1

## Active Tracks
- File-size enforcement refactor (10-gate batches)
- Inspector orchestrator decomposition
- Surface orchestrator decomposition
- Bushing renderer migration: D3 -> Babylon

## Plan Packages
- `/Users/nautilus/Desktop/StructuralCompanionDesktop/implementation/BUSHING_D3_TO_BABYLON_GATED_PLAN_V1.md`
- `/Users/nautilus/Desktop/StructuralCompanionDesktop/implementation/bushing-d3-to-babylon-plan-v1/PLAN.md`
- `/Users/nautilus/Desktop/StructuralCompanionDesktop/FILE_SIZE_POLICY_GATED_PLAN_V1.md`

## Batch Completed (Gates 41-50)
1. Gate 41 (SPLIT-041): Wired `SurfaceLifecycleController` into `SurfaceOrchestrator`.
2. Gate 42 (SPLIT-042): Removed duplicate global key/context-menu/dev-logger wiring from `SurfaceOrchestrator` `onMount`.
3. Gate 43 (SPLIT-043): Created `InspectorVirtualGridHeader.svelte` and extracted grid header rendering.
4. Gate 44 (SPLIT-044): Created `InspectorVirtualGridRows.svelte` and extracted virtual row rendering.
5. Gate 45 (SPLIT-045): Rewired `InspectorVirtualGrid.svelte` to use extracted header/body components.
6. Gate 46 (SPLIT-046): Reduced `InspectorVirtualGrid.svelte` to policy-compliant size (296 lines).
7. Gate 47 (SPLIT-047): Validated compile/type health with `svelte-check`.
8. Gate 48 (SPLIT-048): Validated surface architecture checks.
9. Gate 49 (SPLIT-049): Validated bushing architecture checks.
10. Gate 50 (SPLIT-050): Validated full bushing regression package including e2e countersink mode gating checks.

## Next Batch Queue (Gates 51-60)
1. Gate 51 (SPLIT-051): Extract `SurfaceOrchestrator` top action bar into `SurfaceTopActionBar.svelte`.
2. Gate 52 (SPLIT-052): Extract collapsed/expanded right rail shell into `SurfaceRightRailShell.svelte`.
3. Gate 53 (SPLIT-053): Extract right-rail core status/flow cards into `SurfaceCoreStatusCards.svelte`.
4. Gate 54 (SPLIT-054): Extract right-rail creation/sampler/interpolation cluster into `SurfaceGeometryOpsPanel.svelte`.
5. Gate 55 (SPLIT-055): Extract `SurfaceOrchestrator` viewport mount/zoom/drag setup into `SurfaceViewportMountController.ts`.
6. Gate 56 (SPLIT-056): Extract inspector top toolbar shell from `InspectorOrchestrator.svelte`.
7. Gate 57 (SPLIT-057): Extract inspector footer/status trays from `InspectorOrchestrator.svelte`.
8. Gate 58 (SPLIT-058): Re-run and triage `verify:file-size-policy` residual Svelte and Rust violations.
9. Gate 59 (SPLIT-059): Re-run `verify:surface-architecture` and `verify:bushing-regression` after splits.
10. Gate 60 (SPLIT-060): Sync Babylon migration plan references with orchestrator split architecture.

## Batch Completed (Gates 51-60)
1. Gate 51 (SPLIT-051): Extracted `SurfaceActionBar.svelte` from `SurfaceOrchestrator`.
2. Gate 52 (SPLIT-052): Extracted `InspectorMainGridPanel.svelte` from `InspectorOrchestrator`.
3. Gate 53 (SPLIT-053): Rewired inspector main query/grid block through extracted panel.
4. Gate 54 (SPLIT-054): Rewired surface top action strip through extracted action bar.
5. Gate 55 (SPLIT-055): Maintained lifecycle split wiring stability after action-bar extraction.
6. Gate 56 (SPLIT-056): Revalidated `svelte-check`, surface architecture, and bushing smoke e2e.
7. Gate 57 (BAB-001): Introduced canonical draft scene contract (`BushingDraftRenderer.ts`) derived from profile primitives.
8. Gate 58 (BAB-002): Added renderer adapter path (`renderSvgDraft`, canonical conversion) decoupled from legacy section paths.
9. Gate 59 (BAB-003): Added draft engine feature flag (`svg|babylon`) with persisted localStorage + context-menu/action toggles.
10. Gate 60 (BAB-005 bootstrap): Added `BushingBabylonCanvas.svelte` host scaffold (independent canonical draw path) behind flag.

## Batch In Progress (Gates 61-70)
1. Gate 61 (SPLIT-061): Extracted inspector advanced top controls shell into `InspectorTopControlsPanel.svelte`.
2. Gate 62 (SPLIT-062): Extracted inspector loaded-files/metrics footer into `InspectorFooterBars.svelte`.
3. Gate 63 (SPLIT-063): Rewired `InspectorOrchestrator` to use top-controls and footer panel components.
4. Gate 64 (SPLIT-064): Extracted surface right rail into `SurfaceRightRail.svelte`.
5. Gate 65 (SPLIT-065): Extracted surface viewport mount/zoom/drag lifecycle into `SurfaceViewportMountController.ts`.
6. Gate 66 (SPLIT-066): Rewired `SurfaceOrchestrator` `onMount` to lifecycle + viewport controllers.
7. Gate 67 (SPLIT-067): Re-ran `svelte-check` and resolved extracted-component contract issues.
8. Gate 68 (SPLIT-068): Enforced file-size cap on new right-rail component (reduced to 298 lines).
9. Gate 69 (SPLIT-069): Re-ran `verify:surface-architecture` after decomposition.
10. Gate 70 (SPLIT-070): Re-ran `verify:file-size-policy` and triaged remaining violators.

## Batch In Progress (Gates 71-80)
1. Gate 71 (SPLIT-071): Extracted surface modal composition into `SurfaceModalStack.svelte`.
2. Gate 72 (SPLIT-072): Rewired `SurfaceOrchestrator` modal block to `SurfaceModalStack`.
3. Gate 73 (SPLIT-073): Extracted inspector overlay composition into `InspectorOverlayPanel.svelte`.
4. Gate 74 (SPLIT-074): Rewired `InspectorOrchestrator` overlay block to `InspectorOverlayPanel`.
5. Gate 75 (SPLIT-075): Stabilized extracted overlay wrapper prop contracts and bindings.
6. Gate 76 (SPLIT-076): Revalidated full compile/type health (`svelte-check`).
7. Gate 77 (SPLIT-077): Revalidated `verify:surface-architecture` after modal/overlay splits.
8. Gate 78 (SPLIT-078): Revalidated `verify:file-size-policy` and triaged residual over-limit files.
9. Gate 79 (SPLIT-079): Brought all newly introduced split components under Svelte 300-line cap.
10. Gate 80 (SPLIT-080): Captured orchestrator delta baseline for next deep controller extraction pass.

## Batch In Progress (Gates 81-90)
1. Gate 81 (SPLIT-081): Added `InspectorModalUiController.ts` for modal open/drag/reset/floating handlers.
2. Gate 82 (SPLIT-082): Added `InspectorMultiQueryUiController.ts` for multi-query add/remove/update/toggle handlers.
3. Gate 83 (SPLIT-083): Rewired inspector modal helper functions to controller delegates.
4. Gate 84 (SPLIT-084): Rewired inspector multi-query handlers to controller delegates.
5. Gate 85 (SPLIT-085): Added `SurfaceRecipeUiController.ts` for recipe snapshot/apply/select/save/delete/toggle flows.
6. Gate 86 (SPLIT-086): Added `SurfaceCylinderUiController.ts` for cylinder threshold and inlier/outlier selection flows.
7. Gate 87 (SPLIT-087): Rewired surface recipe and cylinder helper functions to controller delegates.
8. Gate 88 (SPLIT-088): Revalidated compile health (`svelte-check`) after controller extraction.
9. Gate 89 (SPLIT-089): Revalidated `verify:surface-architecture` post-extraction.
10. Gate 90 (SPLIT-090): Revalidated `verify:file-size-policy` and recorded residual orchestrator/Rust violations.

## Batch In Progress (Gates 91-100)
1. Gate 91 (SPLIT-091): Added `InspectorOrchestratorDeps.ts` to consolidate inspector orchestration imports/re-exports.
2. Gate 92 (SPLIT-092): Rewired `InspectorOrchestrator.svelte` import graph to dependency module.
3. Gate 93 (SPLIT-093): Added `SurfaceOrchestratorDeps.ts` to consolidate surface orchestration imports/re-exports.
4. Gate 94 (SPLIT-094): Rewired `SurfaceOrchestrator.svelte` import graph to dependency module.
5. Gate 95 (SPLIT-095): Added `InspectorModalUiController.ts` and rewired modal UI delegation.
6. Gate 96 (SPLIT-096): Added `InspectorMultiQueryUiController.ts` and rewired multi-query delegation.
7. Gate 97 (SPLIT-097): Added `SurfaceRecipeUiController.ts` and rewired recipe state helper delegation.
8. Gate 98 (SPLIT-098): Added `SurfaceCylinderUiController.ts` and rewired cylinder threshold helper delegation.
9. Gate 99 (SPLIT-099): Revalidated compile health (`svelte-check`) across all extractions.
10. Gate 100 (SPLIT-100): Revalidated `verify:surface-architecture` + `verify:file-size-policy` and captured residual violators.

## Batch In Progress (Gates 101-110)
1. Gate 101 (SPLIT-101): Added `InspectorMenuController.ts` to externalize inspector context-menu model construction.
2. Gate 102 (SPLIT-102): Rewired inspector context-menu `$effect` to use menu builder controller.
3. Gate 103 (SPLIT-103): Added `SurfaceEvaluationUiController.ts` for cylinder/plane/slice/datum evaluation helpers.
4. Gate 104 (SPLIT-104): Rewired surface eval/datum helper flows to `SurfaceEvaluationUiController`.
5. Gate 105 (SPLIT-105): Added `SurfaceRecipeRunUiController.ts` for recipe-run lifecycle execution.
6. Gate 106 (SPLIT-106): Rewired surface recipe-run handlers (`start/next/cancel/pause`) to controller.
7. Gate 107 (SPLIT-107): Expanded dependency consolidation using `InspectorOrchestratorDeps.ts` and `SurfaceOrchestratorDeps.ts`.
8. Gate 108 (SPLIT-108): Revalidated compile/type health (`svelte-check`) after deep controller decomposition.
9. Gate 109 (SPLIT-109): Revalidated `verify:surface-architecture` and captured post-split soft-limit delta.
10. Gate 110 (SPLIT-110): Revalidated `verify:file-size-policy` and captured remaining orchestrator/Rust violations.

## Batch Completed (Gates 111-120)
1. Gate 111 (SPLIT-111): Added `SurfaceViewportMathController.ts` for rotate/edge-hit/orbit-pivot/depth-opacity helpers.
2. Gate 112 (SPLIT-112): Rewired `SurfaceOrchestrator.svelte` viewport rotation/edge-hit/orbit-pivot helpers to controller delegates.
3. Gate 113 (SPLIT-113): Rewired `SurfaceOrchestrator.svelte` depth-opacity helpers to controller delegates.
4. Gate 114 (SPLIT-114): Added `InspectorRegexGeneratorUiController.ts` to externalize regex-generator UI logic.
5. Gate 115 (SPLIT-115): Rewired regex clause add/remove/reorder handlers in `InspectorOrchestrator.svelte` to controller delegates.
6. Gate 116 (SPLIT-116): Rewired regex derived output/error/warning/test-match computations in `InspectorOrchestrator.svelte`.
7. Gate 117 (SPLIT-117): Rewired generated-regex apply action to controller delegate while preserving modal contract.
8. Gate 118 (SPLIT-118): Revalidated compile/type health with `svelte-check` (pass).
9. Gate 119 (SPLIT-119): Revalidated `verify:surface-architecture` (pass with existing soft-limit warning).
10. Gate 120 (SPLIT-120): Revalidated `verify:bushing-e2e-smoke` (pass) and re-triaged `verify:file-size-policy` residual violations.

## Babylon Batch Completed (BAB-006..BAB-010)
1. Gate 006 (BAB-006): Implemented deterministic orthographic camera + neutral lighting baseline in `src/lib/drafting/bushing/BushingBabylonRuntime.ts`.
2. Gate 007 (BAB-007): Implemented canonical-loop polygon sampling + mesh generation in `src/lib/drafting/bushing/BushingBabylonGeometry.ts` and runtime mesh builder.
3. Gate 008 (BAB-008): Implemented semantic material mapping for housing/bushing/bore/void in `src/lib/drafting/bushing/BushingBabylonRuntime.ts`.
4. Gate 009 (BAB-009): Added Babylon diagnostics propagation into bushing UI (`src/lib/drafting/bushing/BushingDrafting.svelte`, `src/lib/components/bushing/BushingOrchestrator.svelte`).
5. Gate 010 (BAB-010): Revalidated batch boundary with `verify:bushing-architecture`, `verify:bushing-e2e-smoke`, and full `verify:bushing-regression` (all pass).

## Babylon Batch Completed (BAB-011..BAB-020)
1. Gate 011 (BAB-011): Added Babylon parity harness (`BushingBabylonParity.ts`) and parity tests (`tests/bushing-babylon-parity.spec.ts`).
2. Gate 012 (BAB-012): Added countersink-specific parity assertions (internal/external mode variants) to Babylon parity suite.
3. Gate 013 (BAB-013): Added Babylon viewport interaction controls (`+`, `-`, `Reset`) via runtime + canvas host.
4. Gate 014 (BAB-014): Added/validated perf budget checks through throughput and render-stress runs.
5. Gate 015 (BAB-015): Added export strategy ADR (`ADR_BAB_015_EXPORT_SOURCE_OF_TRUTH.md`) retaining SVG export source-of-truth during migration.
6. Gate 016 (BAB-016): Added export compatibility test (`tests/bushing-export-babylon-compat.spec.ts`) with Babylon-active workflow assumptions.
7. Gate 017 (BAB-017): Hardened renderer selector with persisted auto-fallback to SVG on Babylon init failure.
8. Gate 018 (BAB-018): Extended baseline coverage with Babylon parity suite and refreshed visual baselines after deterministic path serialization change.
9. Gate 019 (BAB-019): Integrated Babylon checks into regression (`verify:bushing-babylon-parity`, `verify:bushing-export-babylon-compat`).
10. Gate 020 (BAB-020): Validated dual-path behavior with Babylon default + forced SVG fallback e2e scenarios.

## Babylon Batch Completed (BAB-021..BAB-030)
1. Gate 021 (BAB-021): Switched bushing draft engine default to Babylon.
2. Gate 022 (BAB-022): Retained explicit SVG fallback (toggle + localStorage + auto-fallback on init failure).
3. Gate 023 (BAB-023): Removed `d3.path()` from bushing section builder (`sectionProfile.ts`) and shared drafting path primitives (`d3Primitives.ts` now D3-free).
4. Gate 024 (BAB-024): Retired legacy `d3BushingFigure*` modules and rewired architecture manifest to Babylon modules.
5. Gate 025 (BAB-025): Marked blocked outside bushing scope: global `d3` is still required by Surface/Profile modules.
6. Gate 026 (BAB-026): Completed bundle/perf verification (`npm run -s build`, throughput + stress checks).
7. Gate 027 (BAB-027): Added migration documentation updates and closeout report (`BABYLON_BATCH2_3_REPORT.md`).
8. Gate 028 (BAB-028): Added runtime telemetry hooks for Babylon init failures (counter + last failure payload + structured warning).
9. Gate 029 (BAB-029): Completed stabilization soak via repeated render-stress passes.
10. Gate 030 (BAB-030): Closed bushing-scope migration with full regression green; retained BAB-025 blocker for cross-tool dependency cleanup.

## Governance
- Execute in 10-gate batches.
- Do not start next batch until policy verification + targeted regressions are reviewed.
- Keep Babylon migration plan synchronized with ongoing refactors.
