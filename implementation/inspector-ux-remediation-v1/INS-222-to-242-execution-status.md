# INS-222 to INS-242 Execution Status

Date: 2026-02-10

## Completed in this batch
- [x] INS-222 Inline multi-query compact/expanded states
- [x] INS-223 Sticky query state sync across dataset switch / recipe apply / reset
- [x] INS-224 Sticky layering and header offset correction
- [x] INS-230 Pixel-snapped virtualization translate and bounded row math
- [x] INS-231 Removed row transition churn during scroll
- [x] INS-232 Fixed row-height contract enforcement in virtual rows
- [x] INS-233 Added grid-window math regression tests
- [x] INS-240 Motion-depth token classes introduced
- [x] INS-241 Nested-card downgrade policy applied (reduced inner tilt)
- [x] INS-242 Preserved pop/rim glow while lowering inner parallax

## Key changes
- Query UX
  - Added multi-query `Compact/Expand` state in top controls.
  - Persisted multi-query chain state via recipe/last-state capture and apply paths.
  - Clear-all reset now clears multi-query chain state.
- Grid stability
  - Introduced `InspectorGridWindowController` for normalized row-height/start-index/translate snapping.
  - Virtual grid now uses `translate3d` with pixel-snapped offsets and fixed row/cell heights.
  - Removed per-row in/out transition path to avoid scroll-jitter churn.
- Motion policy
  - Added depth token classes and reduced nested-card lift/tilt intensity.
  - Kept glow/pop identity while reducing stacked 3D drift.

## Files touched
- `src/lib/components/inspector/InspectorTopControls.svelte`
- `src/lib/components/inspector/InspectorOrchestrator.svelte`
- `src/lib/components/inspector/InspectorOrchestratorFilterController.ts`
- `src/lib/components/inspector/InspectorOrchestratorStateController.ts`
- `src/lib/components/inspector/InspectorRecipesController.ts`
- `src/lib/components/inspector/InspectorDataStore.ts`
- `src/lib/components/inspector/InspectorVirtualGrid.svelte`
- `src/lib/components/inspector/InspectorGridWindowController.ts`
- `src/lib/components/inspector/InspectorMergedGrid.svelte`
- `src/app.css`
- `tests/inspector-grid-window.spec.ts`

