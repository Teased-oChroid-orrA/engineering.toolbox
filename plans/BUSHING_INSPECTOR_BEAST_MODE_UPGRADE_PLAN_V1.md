## Bushing + Inspector Beast Mode Upgrade Plan

Date: 2026-04-02

### Scope

1. Bushing upgrades
   - Add scenario compare support for fast baseline vs alternate fit/process cases.
   - Add reusable presets/workspace persistence for common bushing setups.
   - Add reamer catalog import/application flow for `reamer_fixed` bore capability.

2. Inspector upgrades
   - Add saved workspace snapshots beyond recipe-only persistence.
   - Add practical schema drift baseline capture and compare workflow.

3. Data/catalog work
   - Research aerospace/aircraft-oriented reamer size/tolerance data from primary sources.
   - Ship a curated CSV with preferred/common aircraft sizes flagged.

### Execution Tracks

1. Bushing track
   - Extend bushing state/persistence for scenario sets and presets.
   - Surface compare results in summary/report UI.
   - Add catalog-driven bore capability application path.

2. Inspector track
   - Persist named workspace snapshots keyed by dataset/workspace context.
   - Expose schema baseline capture, diff, and restore actions in the modal workflow.

3. Reamer catalog track
   - Create a curated CSV using aerospace-relevant sizes and explicit tool tolerances.
   - Mark preferred/common aircraft sizes separately from the broader stocked set.
   - Wire built-in CSV loading plus custom CSV override into the bushing UI.

### Verification Gates

1. Static/build
   - `npm run check`
   - `npm run build`

2. Bushing targeted
   - Bushing UI / export / DnD tests as affected by the new compare and catalog flow.

3. Inspector targeted
   - Inspector overlay / menu / workspace / schema tests as affected by snapshot and drift features.

4. Runtime smoke
   - `tests/console-all-toolboxes.spec.ts`

### Done Criteria

1. Bushing can load/apply a curated aerospace reamer CSV for `reamer_fixed` use cases.
2. Bushing exposes scenario compare and persistent presets in the live UI.
3. Inspector supports named workspace snapshots and visible schema drift baseline compare.
4. Broad repo gates and affected targeted tests pass on the final tree.
