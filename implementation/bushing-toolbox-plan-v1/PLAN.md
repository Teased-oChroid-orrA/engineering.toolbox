# Bushing Toolbox Plan v1

## Scope
Modernize and harden the Bushing Toolbox while aligning UX and architecture philosophy with Surface and Inspector.

## Policy
- Prefer all dependencies already present in `package.json`.
- Add new dependencies only when they provide measurable improvement (performance, maintainability, or UX quality).
- Document rationale for each newly added dependency.
- All sketches/figures/technical graphics must use `d3` as the primary rendering orchestration layer.

## Gate 0: Program Setup, Dependency Policy, and Guardrails
- `BSH-000` Create Bushing architecture manifest + LOC caps.
- `BSH-001` Add `verify-bushing-architecture` script and wire into `npm run check`.
- `BSH-002` Dependency policy enforcement + change-log notes per added package.
- `BSH-003` D3 visualization standard for all Bushing figures.

## Gate 1: Contract and Solver Truth
- `BSH-010` Unify `BushingInputs/BushingOutput` into one canonical types module.
- `BSH-011` Add `normalizeBushingInputs()` adapter (legacy aliases to canonical schema).
- `BSH-012` Route/export/public API consume canonical types only.
- `BSH-013` Add validation (zod) + structured warning codes.

## Gate 2: Solver-Authoritative Drafting Parity
- `BSH-020` Build canonical `solverViewModel` (`form + results.geometry + results.csSolved`).
- `BSH-021` Feed same `solverViewModel` into live drafting, SVG export, and PDF report metadata.
- `BSH-022` Add parity tests ensuring live and export renderings use identical solved geometry inputs.

## Gate 3: D3-First Sketch/Figure System
- `BSH-030` Refactor Bushing drafting renderers to a D3-driven geometry/drawing pipeline.
- `BSH-031` Consolidate shared figure primitives (axes, hatching, dimensions, annotations) in D3 utilities.
- `BSH-032` Ensure export path uses same D3 figure model (no divergent logic).
- `BSH-033` Add visual regression snapshots for key bushing configurations.

## Gate 4: UI Modernization and Pop Visual System
- `BSH-040` Add dedicated Bushing pop-card visual classes (lift, slight 3D tilt, rim glow, layered depth).
- `BSH-041` Apply treatment to actionable Bushing cards/panels/submenus/modals.
- `BSH-042` Add motion timing tiers (standard + deliberate) with reduced-motion fallback.
- `BSH-043` Align interaction language with Surface/Inspector.

## Gate 5: Full Toolbox Reorganization (Modern Flow)
- `BSH-050` Reorganize workflow sections: Setup, Geometry, Profile, Process/Limits, Results, Drafting/Export.
- `BSH-051` Add concise inline helper guidance (non-modal).
- `BSH-052` Improve hierarchy: summary cards + expandable details + warning UX stack.
- `BSH-053` Keep non-core/advanced controls out of primary attention path.

## Gate 6: Decomposition and LOC Compliance
- `BSH-060` Split `/src/routes/bushing/+page.svelte` into orchestrator + presenters/controllers.
- `BSH-061` Split drafting into manageable modules (figure model, renderer, annotations, export adapter).
- `BSH-062` Move export/report assembly into dedicated modules.
- `BSH-063` Enforce file/module LOC limits with verify script failures.

## Gate 7: Regression and Release Safety
- `BSH-070` Restore/wire golden solver fixtures.
- `BSH-071` Add solver unit tests (straight/flanged/countersink + imperial/metric edge cases).
- `BSH-072` Add Bushing smoke e2e (compute + D3 render + export actions).
- `BSH-073` Release readiness checklist (correctness, performance, accessibility, visual consistency).

## Execution Assets
- `implementation/bushing-toolbox-plan-v1/PLAN.md` (this file)
- `implementation/bushing-toolbox-plan-v1/taskboard.md` (next)
- `implementation/bushing-toolbox-plan-v1/dag.md` (next)
- `implementation/bushing-toolbox-plan-v1/tickets/BSH-000..073.md` (next)
- `src/lib/bushing/BushingArchitectureManifest.ts` (next)
- `scripts/verify-bushing-architecture.mjs` (next)
