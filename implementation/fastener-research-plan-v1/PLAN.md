# Fastener Implementation Plan V2 (Strict Gates)

## Objective
Deliver a self-contained, deterministic joint analysis subsystem for aircraft repair/sustainment workflows, mapped to existing Structural Companion Fastener architecture.

## Non-Negotiable Physics Policy
- Exact linear-elastic axial continuum equations in core path.
- No pressure-cone, frustum, influence-angle, or empirical stiffness shortcuts.
- Visualization consumes computed outputs only (no physics logic in view components).

## Allowed Assumptions Ledger (Explicit)
- `A1` Axisymmetric reduction is allowed only for axisymmetric geometry, preload, and boundary conditions.
- `A2` Non-axisymmetric geometry/load cases must be rejected by axisymmetric mode (or routed to future 3D mode).
- `A3` Linear elastic constitutive law is allowed for baseline.
- `A4` Material cards must define all used parameters (`E`, `nu`, and `alpha` when thermal is enabled).
- `A5` No empirical stiffness/compliance factors are permitted.
- `A6` Small strain/small displacement is allowed for baseline.
- `A7` Solver must report out-of-model validity when displacement/strain thresholds are exceeded.
- `A8` Unilateral normal contact constraints are allowed.
- `A9` Active-set or augmented-Lagrangian enforcement is allowed as numerical method (not physics shortcut).
- `A10` With friction OFF, tangential traction is exactly zero by model definition.
- `A11` No thread spring-equivalent or handbook compliance substitutions are allowed.
- `A12` Thread engagement may be represented with explicit continuum contact surfaces and declared geometric simplification level.
- `A13` Any geometric simplification must be explicitly listed in output assumptions.
- `A14` Preload is introduced via pretension section constraint (or equivalent variational preload method).
- `A15` Torque-to-preload is optional input preprocessing only; core mechanical solve uses imposed preload state.
- `A16` All reported forces/load transfer values must come from explicit field integrations (`∫A`, `∫Γ`, `∫V`).
- `A17` No effective area, pressure-cone, frustum, or load-angle assumptions are allowed.
- `A18` 1D flow view is visualization only and must consume postprocessed integrated results.

## Gate Map (Architecture-Coupled)

### Gate 1 — Data Foundation and Engineering Inputs
Mapped modules:
- `src/lib/core/fastener/types.ts`
- `src/lib/core/fastener/catalog.ts` (new)
- `src/routes/fastener/+page.svelte`

Deliverables:
- Material catalog (fastener/member materials, `E`, `alpha`, optional `nu`).
- Bolt-size catalog (`diameter`, `pitch`, `tensileStressArea`, bearing diameter defaults).
- Editable stack controls: segment geometry, material selection, bolt size propagation.
- Editable multi-bolt row controls and selectable active bolt.

Exit criteria:
- Users can fully modify materials, thickness/length, bolt size and row bolt positions from UI.

### Gate 2 — Interaction and Visualization Upgrade
Mapped modules:
- `src/lib/components/fastener/FastenerAxialD3View.svelte`
- `src/lib/components/fastener/FastenerRowD3View.svelte` (new)
- `src/lib/core/fastener/visualization.ts`
- `src/routes/fastener/+page.svelte`

Deliverables:
- Live-updating joint row visualization (members + bolts).
- Bolt selection in row view and highlighted bolt metrics.
- Consistent sticky engineering summary adjacent to interaction controls.

Exit criteria:
- Any edit updates solver and both visualizations immediately and deterministically.

### Gate 3 — Solver Completeness Enhancements (Deterministic)
Mapped modules:
- `src/lib/core/fastener/solve.ts`
- `src/lib/core/fastener/checks.ts` (new)
- `src/lib/core/fastener/types.ts`

Deliverables:
- Deterministic joint checks: bearing, net-section proxy, preload retention indicators.
- Explicit assumptions in output (`modelAssumptions`), including no-pressure-cone declaration.
- Error/warning normalization for invalid geometry/material ranges.

Exit criteria:
- Solver returns both response and check set with pass/fail + margins.

### Gate 4 — Thermal/Contact Refinement Hardening
Mapped modules:
- `src/lib/core/fastener/solve.ts`
- `tests/fastener-solver.spec.ts`

Deliverables:
- Additional convergence guards and residual trace constraints.
- Thermal profile consistency checks (missing element IDs, unit-safe defaults).

Exit criteria:
- Deterministic convergence behavior in closed and separated regimes.

### Gate 5 — Verification and Production Readiness
Mapped modules:
- `tests/fastener-solver.spec.ts`
- `implementation/fastener-research-plan-v1/taskboard.md`

Deliverables:
- Expanded regression coverage for catalogs, editable stack behavior, and row selection invariants.
- All repo checks passing with no unresolved fastener-related warnings/errors.

Exit criteria:
- `npm run -s check` passes.
- fastener test suite passes.

## Deferred Gates (Queued)
- Matrix-based multi-member flexibility coupling.
- Nonlinear frictional slip/contact tangential coupling.
- Temperature-dependent allowables and uncertainty bands.
- 2D/3D continuum compliance integration path.
