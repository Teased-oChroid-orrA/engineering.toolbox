# Preload Beast Mode Execution Plan V1

## Objective

Complete the preload follow-up work end to end:

1. Add report/export parity for new compare packs, expanded inverse targets, and staged load-transfer progression.
2. Reduce preload route complexity by extracting review-specific helper/view-model logic out of `src/routes/preload/+page.svelte`.
3. Add memoization for compare-pack solving to avoid repeated route-level recomputation.
4. Expose inverse-target threshold settings in the preload UI and propagate them into the inverse solver/report path.
5. Extend automated visual verification to cover the new compare-pack and load-transfer panels.

## Scope

### In scope

- `src/lib/core/preload/types.ts`
- `src/lib/core/preload/solve-preload.ts`
- `src/lib/core/preload/report.ts`
- `src/routes/preload/+page.svelte`
- New extracted preload helper/view-model modules under `src/lib/`
- `tests/preload-solver.spec.ts`
- `tests/preload-ui.spec.ts`
- `tests/preload-summary-screenshots.spec.ts`

### Out of scope

- Global preload architecture rewrite
- Non-preload toolboxes
- Changing the fundamental preload physics model beyond the requested threshold/configurability additions

## Workstreams

### WS1: Report / Export Parity

Goals:

- Extend the equation-sheet export so it includes:
  - compare-pack summaries for thermal, friction, and preload loss
  - all inverse targets, including separation and fatigue
  - staged load-transfer progression summary
- Keep the exported report audit-oriented and compact.

Primary files:

- `src/lib/core/preload/report.ts`
- `src/lib/core/preload/types.ts`
- `tests/preload-solver.spec.ts`

Acceptance:

- Exported HTML contains the new sections with stable labels.
- Existing export path from preload route still works without route-level post-processing hacks.

### WS2: Route Modularization

Goals:

- Pull review-specific helper/view-model logic out of the route into extracted TS helpers.
- Keep route behavior unchanged while reducing embedded calculation/config noise.

Candidate extraction areas:

- compare-pack metric configuration and row derivation
- load-transfer stage derivation
- inverse-card presentation mapping

Primary files:

- `src/routes/preload/+page.svelte`
- new helper modules under `src/lib/`

Acceptance:

- Route compiles and behavior is preserved.
- A meaningful amount of review-specific calculation logic no longer lives inline in the route.

### WS3: Compare-Pack Memoization

Goals:

- Avoid repeatedly recomputing the same compare packs for identical solver inputs.
- Keep cache semantics deterministic and bounded.

Primary files:

- `src/lib/core/preload/solve-preload.ts`
- `tests/preload-solver.spec.ts`

Acceptance:

- Compare-pack builder can reuse results for identical normalized inputs.
- No behavior regression in existing compare-pack outputs.

### WS4: Inverse Target Settings

Goals:

- Add UI-configurable inverse-target thresholds instead of hard-coded solver constants.
- Support at least:
  - slip target utilization
  - separation target utilization
  - proof target utilization
  - bearing target utilization
  - fatigue target utilization

Primary files:

- `src/lib/core/preload/types.ts`
- `src/lib/core/preload/solve-preload.ts`
- `src/routes/preload/+page.svelte`
- `src/lib/core/preload/report.ts`
- `tests/preload-solver.spec.ts`

Acceptance:

- User can modify targets in preload UI.
- Solver output and report reflect those settings.

### WS5: Visual Verification

Goals:

- Add screenshot coverage for:
  - compare-pack review section
  - staged load-transfer progression

Primary files:

- `tests/preload-summary-screenshots.spec.ts`
- optional supporting preload UI tests

Acceptance:

- Stable screenshot paths added under `implementation/screenshots/`
- Browser tests pass locally.

## Execution Order

1. Land core type/solver changes for inverse settings and report inputs.
2. Land route helper extraction and route wiring.
3. Land report parity once the new data contracts are stable.
4. Land screenshot/visual coverage.
5. Run `svelte-check`, preload solver tests, preload UI tests, and preload screenshot tests.

## Risks

- `src/routes/preload/+page.svelte` is already very large, so route edits must be kept incremental and validated frequently.
- Report parity may tempt route-local formatting duplication; avoid this by keeping report data assembly in core/helper code.
- Memoization must not cache mutable objects by reference in a way that leaks stale state into the UI.

## Verification Matrix

- `npx svelte-check --tsconfig ./tsconfig.json`
- `npx playwright test --config=playwright.unit.config.ts tests/preload-solver.spec.ts`
- `npx playwright test tests/preload-ui.spec.ts`
- `npx playwright test tests/preload-summary-screenshots.spec.ts`

## Definition Of Done

- Functional: all requested follow-up improvements are implemented.
- Quality: targeted preload tests and Svelte diagnostics pass.
- Regression: preload UI export, compare, and review flows remain operational.
- Handoff: changed files, evidence, and residual risks are documented.
