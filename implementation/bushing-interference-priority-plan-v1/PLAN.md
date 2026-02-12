# Bushing Interference Priority Plan v1

## Scope
Guarantee that achieved interference tolerance never exceeds user-specified min/max limits when `Interference Priority` is enabled, while supporting reamer-fixed bore workflows.

## Problem Framing
Current behavior can be mathematically infeasible when bore tolerance width is wider than the target interference width. In those cases, OD-only solving cannot satisfy full-range containment.

## Research Baseline
- ISO 286 defines tolerance classes and fit-function intent for linear sizes (`IT` grades, tolerance intervals, fit-oriented system behavior).
- Reaming process/tool references indicate IT7-class hole capability is common for production reaming workflows.
- Process capability should be treated as a statistical capability problem (`Cp/Cpk`) and not only a nominal algebra problem.

## Hard Requirements
- When enforcement is ON, achieved interference interval must satisfy:
  - `achieved.lower >= target.lower`
  - `achieved.upper <= target.upper`
- If infeasible under locked-bore conditions, solver must return explicit UNSAT diagnostics (no silent pseudo-pass).
- Bore nominal must remain unchanged by default in auto-adjust mode.

## Constraint Hierarchy (Lexicographic)
1. `P0` Hard containment of interference interval (cannot violate).
2. `P1` Preserve bore nominal unless user explicitly enables nominal shift.
3. `P2` Respect bore process capability limits (reamer/tooling floor/ceiling).
4. `P3` Minimize disturbance to prior user inputs (OD nominal/tolerance, countersink outputs).
5. `P4` Preserve downstream structural checks (reported separately, never hidden).

## Gate 0: Contracts + Capability Model
- `BIF-000` Canonicalize interference enforcement policy model in core types.
- `BIF-001` Add bore process capability model (fixed reamer, adjustable with floor, custom).
- `BIF-002` Add normalization/schema support and migration for persisted inputs.

## Gate 1: Strict Feasibility Kernel
- `BIF-010` Implement strict containment feasibility math and UNSAT margin reporting.
- `BIF-011` Implement auto-adjust policy A: preserve bore nominal, shrink bore tolerance band.
- `BIF-012` Implement optional policy B: nominal shift within user bounds (opt-in only).
- `BIF-013` Add solver notes and machine-readable failure reasons for blocked enforcement.

## Gate 2: UX + Controls
- `BIF-020` Add Interference Priority control group in Process/Limits panel.
- `BIF-021` Add controls: `Lock Bore (Reamer Fixed)`, `Preserve Bore Nominal`, `Allow Nominal Shift`.
- `BIF-022` Add capability input controls: bore minimum achievable tolerance width and optional preferred IT class label.
- `BIF-023` Add in-card diagnostics: required vs available bore width, containment margin, reason codes.

## Gate 3: Verification
- `BIF-030` Unit tests: feasibility matrix (feasible/infeasible) for nominal_tol and limits modes.
- `BIF-031` Unit tests: lock vs unlock behavior, preserve-nominal behavior, nominal-shift opt-in behavior.
- `BIF-032` E2E tests: UI toggles + visible diagnostics + no hidden violations.
- `BIF-033` Regression tests for countersink-derived tolerances under enforced mode.

## Gate 4: Release + Guidance
- `BIF-040` Update information/help page with exact constraint logic and examples.
- `BIF-041` Add release-readiness checklist for interference-priority workflows.
- `BIF-042` Add migration notes for existing saved sessions.

## Acceptance Criteria
- With enforcement ON, solver never returns achieved interference outside target range.
- For infeasible locked-bore scenarios, system returns UNSAT with actionable required-change numbers.
- With unlock + preserve nominal, bore nominal remains constant while tolerance band is adjusted when feasible.
- If process capability floor blocks required tightening, solver reports blocked enforcement explicitly.

## References
- ISO 286-2:2010 (GPS code system for tolerances, fit intent and tolerance classes): https://www.alekvs.com/wp-content/uploads/2025/06/ISO-286-2-2010en-Geometrical-product-specifications-GPS-%E2%80%94-ISO-code-system-for-tolerances-on-linear-sizes.pdf
- NIST Engineering Statistics Handbook, Process Capability (`Cp/Cpk` definitions): https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm
- Sandvik Coromant CoroReamer 435 datasheet summary (achievable hole tolerance IT7): https://datasheets.globalspec.com/ds/sandvik-ab/cororeamer-435/586ed8df-61d7-4640-a6fa-70000b7bcd78
