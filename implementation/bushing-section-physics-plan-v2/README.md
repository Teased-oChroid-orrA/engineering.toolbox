# Bushing Section + Physics Plan v2

This package is a complete implementation plan to fix the bushing visualization and harden all core calculations/formulas/physics with minimum assumptions.

## Scope
- Rebuild section visualization so it behaves like a true sectional drawing (cut-material hatching, voids unhatched, stable geometry, dynamic updates).
- Audit and improve bushing physics/calculation model (interference fit, pressure, hoop stress, wall checks, edge-distance logic, warnings).
- Add validation datasets, regression tests, and performance gates.

## Deliverables in this folder
- `PLAN.md` - gated implementation plan.
- `taskboard.md` - issue-sized tickets with estimates and dependencies.
- `dag.md` - dependency DAG.
- `physics-research-matrix.md` - formula audit/research findings and verification strategy.
- `visualization-style-spec.md` - section drafting rules and rendering requirements.
- `validation-gates.md` - acceptance criteria and test commands.
- `tickets/` - ticket-level implementation briefs.

## Assumption policy
- No team-size, sprint-capacity, or staffing assumptions are required.
- All numeric thresholds in this plan are test-driven and file-local; if a threshold is not testable, it is not treated as a gate.
