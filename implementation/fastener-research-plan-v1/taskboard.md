# Fastener Research Taskboard V2

| Ticket | Gate | Status | File Map | Notes |
|---|---|---|---|---|
| FAS-100 Material + bolt catalogs | G1 | DONE | `src/lib/core/fastener/catalog.ts` | Engineering input catalogs for deterministic selection |
| FAS-101 Editable stack geometry and materials UI | G1 | DONE | `src/routes/fastener/+page.svelte` | Length/area/material/segment editing controls |
| FAS-102 Row bolt editor + active bolt selection | G1 | DONE | `src/routes/fastener/+page.svelte` | Add/remove/edit row bolts and selected bolt |
| FAS-110 Row visualization component | G2 | DONE | `src/lib/components/fastener/FastenerRowD3View.svelte` | D3 visualization for bolt row + members |
| FAS-111 Visualization wiring and selected-bolt metrics | G2 | DONE | `src/routes/fastener/+page.svelte` | Highlight active bolt and live metrics |
| FAS-120 Deterministic joint checks module | G3 | DONE | `src/lib/core/fastener/checks.ts` | Bearing/thread/clamp checks with explicit formulas |
| FAS-121 Solver assumptions + validation expansion | G3 | DONE | `src/lib/core/fastener/solve.ts` `src/lib/core/fastener/types.ts` | Explicit no-pressure-cone assumptions in output |
| FAS-130 Thermal/contact hardening tests | G4 | DONE | `tests/fastener-solver.spec.ts` | Added assumptions/catalog/preset/solver-output regression checks |
| FAS-140 Gate verification and closure | G5 | DONE | checks + tests | `npm run -s check` and fastener tests passing |

## Continuum Path (Single Fastener)

| Ticket | Gate | Status | File Map | Notes |
|---|---|---|---|---|
| FAS-C010 Continuum derivation package | A | DONE | `implementation/fastener-research-plan-v1/continuum-derivation.md` | Weak form, axisymmetric element, load/reaction integration documented |
| FAS-C020 Continuum input/model schema | B | DONE | `src/lib/core/fastener/continuum/types.ts` | Layered outer stack + bolt core + mesh/BC/preload schema |
| FAS-C030 Axisymmetric FE mesh + element integration | C | DONE | `src/lib/core/fastener/continuum/mesh.ts` `src/lib/core/fastener/continuum/element-axisym.ts` | Q4 axisymmetric stiffness with Gauss integration |
| FAS-C031 Global assembly + linear solve | C | DONE | `src/lib/core/fastener/continuum/assembly.ts` | Global K/F assembly, constraints, residual norm |
| FAS-C040 Pretension preload path | D | DONE | `src/lib/core/fastener/continuum/assembly.ts` | Equal/opposite bolt-edge traction preload |
| FAS-C041 Contact/friction controls + assumptions | D | DONE | `src/lib/core/fastener/continuum/solve.ts` `src/lib/core/fastener/continuum/assembly.ts` `src/lib/core/fastener/continuum/assumptions.ts` | Active-set interface contact + tangential sticking penalty proxy implemented |
| FAS-C042 Interface-surface AL contact with configurable gap/friction | D | DONE | `src/lib/core/fastener/continuum/solve.ts` `src/lib/core/fastener/continuum/assembly.ts` `src/lib/core/fastener/continuum/types.ts` | Augmented-Lagrangian normal contact + friction-limited tangential traction update loop |
| FAS-C050 Load-transfer postprocess | E | DONE | `src/lib/core/fastener/continuum/postprocess.ts` | Layer-wise bolt/outer force extraction from integrated fields |
| FAS-C060 Results-first UI with collapsible setup | F | DONE | `src/routes/fastener/+page.svelte` | Setup hidden/editable, summary shown in main view |
| FAS-C070 Continuum solver regression tests | G | DONE | `tests/fastener-continuum.spec.ts` | Solve/integration/assumption tests passing |
| FAS-C071 Mesh refinement verification utility | G | DONE | `src/lib/core/fastener/continuum/verification.ts` `tests/fastener-continuum.spec.ts` | Refinement study with convergence delta metrics |
| FAS-C072 Continuum 1D load-flow visualization | F | DONE | `src/lib/components/fastener/FastenerLoadFlow1D.svelte` `src/routes/fastener/+page.svelte` | 1D load-flow chart driven only by continuum-integrated outputs |
