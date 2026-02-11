# Bushing Toolbox Audit: Gated Ticket Plan (V1)

## Objective
Stabilize Bushing Toolbox profile-input behavior, especially countersink mode-driven derived values, and close architecture/test gaps that currently allow regressions.

## Audit Summary

### Confirmed defects
1. Internal CS mode is not driving editable/read-only state for the three CS parameters.
- Evidence: `src/lib/components/bushing/BushingOrchestrator.svelte:253`, `src/lib/components/bushing/BushingOrchestrator.svelte:270`
- Current behavior: `CS Dia` and `CS Depth` are only toggled by `idType`, while `CS Angle` remains fully editable regardless of `csMode`.
- Impact: User can edit all values that should be partially derived by mode.

2. Solved/derived countersink value is not written back to the visible input model.
- Evidence: `src/lib/components/bushing/BushingOrchestrator.svelte:253`, `src/lib/core/bushing/solve.ts:70`
- Current behavior: Solver computes derived `csSolved` values, but UI inputs are bound to `form.*` raw fields and are never synchronized.
- Impact: Displayed input values can disagree with solved geometry; user perceives calculator as not updating.

3. Pipeline mixes normalized and raw models in one render path.
- Evidence: `src/lib/components/bushing/BushingComputeController.ts:40`, `src/lib/components/bushing/BushingComputeController.ts:50`, `src/lib/components/bushing/BushingComputeController.ts:51`
- Current behavior: cache key uses normalized input; compute/view use raw input; scene is then built from raw+solved hybrid.
- Impact: Unit drift risk and non-deterministic behavior in metric mode or after mode transitions.

### High-risk correctness gaps
4. Countersink geometry constraints are too weak.
- Evidence: `src/lib/core/bushing/schema.ts:15`, `src/lib/core/bushing/schema.ts:17`, `src/lib/core/bushing/solve.ts:16`
- Current behavior: allows `csAngle = 0`, `csDia < idBushing`, and derived negative depth paths.
- Impact: physically invalid states can leak into wall checks and scene geometry.

5. Regression coverage does not assert mode-gated UI behavior or derived-field synchronization.
- Evidence: `tests/bushing-ui-throughput.spec.ts:9`, `tests/bushing-e2e-smoke-ui.spec.ts:9`
- Current behavior: tests verify page load and generic updates only.
- Impact: the exact bug you found can reoccur without test failure.

## Gates

### Gate A: Contract + Repro Freeze
Exit criteria:
- Repro scripts for all CS modes (internal + external) documented.
- Expected editable/read-only matrix approved.
- No code changes yet.

### Gate B: UI State Contract (Mode-Driven Inputs)
Exit criteria:
- Exactly two of `{CS Dia, CS Depth, CS Angle}` editable per mode.
- Derived field shown as read-only with explicit prohibited indicator (circle-slash style), consistent with existing disabled semantics.
- Internal and external CS sections follow same mode contract.

### Gate C: Dataflow + Solver Synchronization
Exit criteria:
- Derived field value updates immediately on source-field edits.
- Pipeline uses one canonical normalized model for compute/view/scene.
- No raw-vs-normalized unit mismatch path remains.

### Gate D: Validation Hardening
Exit criteria:
- Invalid CS geometry blocked or coerced with explicit warning.
- Angle and dia/depth invariants enforced and tested.

### Gate E: Regression and Release Gate
Exit criteria:
- New Playwright coverage for mode-gated UI and derived-field sync.
- Unit tests for solver invariants and normalization dataflow.
- `verify:bushing-regression` green.

## Ticket Backlog

### BSH-AUD-001 (Gate A)
- Title: Define CS mode input contract matrix (internal/external)
- Priority: P0
- Scope:
  - Document source-of-truth mapping:
    - `depth_angle`: editable `depth, angle`; derived `dia`
    - `dia_angle`: editable `dia, angle`; derived `depth`
    - `dia_depth`: editable `dia, depth`; derived `angle`
  - Confirm labels and behavior for read-only computed fields.
- Target files:
  - `src/lib/components/bushing/BushingOrchestrator.svelte`
  - `tests/bushing-e2e-smoke-ui.spec.ts`

### BSH-AUD-002 (Gate B)
- Title: Implement mode-driven enable/disable/read-only CS inputs
- Priority: P0
- Scope:
  - Add reactive mode helpers for internal/external CS.
  - Bind `disabled`/`readonly` per matrix instead of only `idType`.
  - Add prohibited visual affordance for computed field.
- Target files:
  - `src/lib/components/bushing/BushingOrchestrator.svelte`
  - `src/lib/components/ui/Input.svelte` (if adornment support is needed)

### BSH-AUD-003 (Gate C)
- Title: Synchronize solved CS value back to displayed model
- Priority: P0
- Scope:
  - On each pipeline evaluation, update only the mode-derived field from `results.csSolved` without clobbering active user inputs.
  - Apply same behavior for internal and external countersinks.
- Target files:
  - `src/lib/components/bushing/BushingOrchestrator.svelte`
  - `src/lib/components/bushing/BushingComputeController.ts`

### BSH-AUD-004 (Gate C)
- Title: Canonicalize pipeline to normalized inputs end-to-end
- Priority: P1
- Scope:
  - Compute from normalized inputs and build view model from normalized inputs.
  - Remove mixed raw/normalized path.
- Target files:
  - `src/lib/components/bushing/BushingComputeController.ts`
  - `src/lib/core/bushing/viewModel.ts`

### BSH-AUD-005 (Gate D)
- Title: Harden countersink input invariants and defensive clamping
- Priority: P1
- Scope:
  - Add schema constraints for realistic angle bounds and positive geometry relationships.
  - Guard `solveCountersink` against invalid dia-depth-angle combinations.
  - Emit explicit warning codes for coerced/invalid CS states.
- Target files:
  - `src/lib/core/bushing/schema.ts`
  - `src/lib/core/bushing/solve.ts`
  - `src/lib/core/bushing/types.ts`

### BSH-AUD-006 (Gate E)
- Title: Add regression tests for CS mode UX and derived updates
- Priority: P0
- Scope:
  - E2E: toggle modes and assert one computed read-only field each time.
  - E2E: edit driver fields and assert computed field updates live.
  - Unit: ensure pipeline/model sync preserves canonical derived value.
- Target files:
  - `tests/bushing-e2e-smoke-ui.spec.ts`
  - `tests/bushing-ui-throughput.spec.ts`
  - `tests/bushing-countersink-consistency.spec.ts`

### BSH-AUD-007 (Gate E)
- Title: Add metric-mode UI regression for scene/summary coherence
- Priority: P2
- Scope:
  - E2E test covering unit toggle + mode edit + drafting sanity checks (no NaN, no geometry collapse).
- Target files:
  - `tests/bushing-e2e-smoke-ui.spec.ts`
  - `tests/bushing-render-mode-contract.spec.ts`

## Execution Order
1. BSH-AUD-001
2. BSH-AUD-002
3. BSH-AUD-003
4. BSH-AUD-004
5. BSH-AUD-005
6. BSH-AUD-006
7. BSH-AUD-007

## Verification Commands
- `npm run -s verify:bushing-countersink-consistency`
- `npm run -s verify:bushing-solver`
- `npm run -s verify:bushing-ui-throughput`
- `npm run -s verify:bushing-e2e-smoke`
- `npm run -s verify:bushing-regression`

## Baseline Test Snapshot (from this audit)
- `verify:bushing-countersink-consistency`: pass
- `verify:bushing-solver`: pass
- `verify:bushing-ui-throughput`: pass
- `verify:bushing-e2e-smoke`: pass

