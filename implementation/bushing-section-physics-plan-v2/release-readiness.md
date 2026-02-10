# Release Readiness Checklist (BSH-121)

## Build and integrity
- [x] `npm run -s check` passes.
- [x] No missing module imports in bushing path integrity gate.
- [x] No stale-path references to legacy scene-model imports.

## Visualization correctness
- [x] Section mode uses canonical loop-based profile.
- [x] Material regions hatch; bore/void region remains unhatched.
- [x] Legacy mode remains available and explicit.
- [x] View/export parity validated (`verify:bushing-parity`).

## Physics correctness
- [x] Formula inventory captured (`src/lib/core/bushing/formulaInventory.ts`).
- [x] Pressure monotonic checks pass.
- [x] Hoop stress + margin verification tests pass.
- [x] Edge-distance warning semantics deterministic.
- [x] Countersink solve consistency checks pass.

## Throughput and stability
- [x] Pipeline cache in place with hit/miss diagnostics.
- [x] Render diffing key prevents redundant scene regeneration.
- [x] UI throughput test verifies summary updates during live edits.

## Golden and dataset pack
- [x] `golden:bushing` passes.
- [x] Combined dataset pack generated:
  - `golden/bushing_dataset_pack/bushing_combined.csv`
  - `golden/bushing_dataset_pack/bushing_combined.metadata.json`

## E2E smoke
- [x] `verify:bushing-e2e-smoke` passes.

## Rollback steps
1. Revert to previous scene renderer by checking out prior versions of:
   - `src/lib/drafting/bushing/bushingSceneModel.ts`
   - `src/lib/drafting/bushing/bushingSceneRenderer.ts`
   - `src/lib/drafting/bushing/BushingDrafting.svelte`
2. Regenerate snapshots:
   - `npm run -s verify:bushing-visual-baseline -- --update-snapshots`
3. Re-run full gate:
   - `npm run -s verify:bushing-regression`

## Ship gate
- [x] Full command `npm run -s verify:bushing-regression` passes.
