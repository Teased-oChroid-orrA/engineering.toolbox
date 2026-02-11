# INS-200 to INS-221 Execution Status

Date: 2026-02-10

## Completed in this batch
- [x] INS-200 Repro matrix (window placement)
- [x] INS-201 Scroll instrumentation baseline
- [x] INS-202 Motion stack audit
- [x] INS-210 Centralized overlay host (portal) added
- [x] INS-211 Shortcuts moved to overlay host
- [x] INS-212 Query generator and related windows moved to overlay host
- [x] INS-213 Placement fallback policy (center default + bounded drag offsets)
- [x] INS-214 Overlay a11y baseline (`role="dialog"`, `aria-modal`, close semantics retained)
- [x] INS-220 Sticky query bar above grid headers
- [x] INS-221 Query controls migrated/kept in sticky bar without behavior change

## Key files touched
- `src/lib/components/inspector/InspectorOverlayPortal.svelte`
- `src/lib/components/inspector/InspectorOrchestrator.svelte`
- `src/lib/components/inspector/InspectorUiState.ts`
- `src/lib/components/inspector/InspectorTopControls.svelte`
- `src/lib/components/inspector/InspectorToolbar.svelte`
- `src/lib/components/inspector/InspectorVirtualGrid.svelte`
- Inspector modal files (`Shortcuts`, `RegexGenerator`, `Recipes`, `Schema`, `SvarBuilder`, `ColumnPicker`, `HeaderPrompt`, `RowDrawer`)

## Validation checklist
- [x] Type/svelte checks pass
- [x] Existing architecture checks pass

