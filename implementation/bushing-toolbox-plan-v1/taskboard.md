# Bushing Toolbox Taskboard v1 (Implementation Ready)

## Capacity Assumptions
- Team: 1 primary engineer + AI pair implementation
- Sprint length: 2 weeks
- Effective capacity: 18 points/sprint (focus-adjusted)
- Risk buffer: 15% reserved per sprint

## Sprint 1 (18 pts): Foundation + Correctness
1. `BSH-000` (2) Architecture manifest + LOC caps
2. `BSH-001` (2) Verify script + check wiring
3. `BSH-010` (3) Canonical I/O types
4. `BSH-011` (3) Input normalizer adapter
5. `BSH-012` (2) Canonical type adoption
6. `BSH-020` (3) Solver view model
7. `BSH-021` (3) Live/export parity wiring

## Sprint 2 (18 pts): D3 Rendering + Modern UI System
1. `BSH-022` (2) Parity tests
2. `BSH-030` (5) D3 drafting pipeline
3. `BSH-031` (3) Shared D3 figure primitives
4. `BSH-032` (3) Export path on same D3 model
5. `BSH-040` (2) Pop-card visual classes
6. `BSH-041` (2) Apply pop styles
7. `BSH-042` (1) Motion tiers + reduced motion

## Sprint 3 (18 pts): Reorg + Decomposition + Release Gates
1. `BSH-043` (1) Interaction language alignment
2. `BSH-050` (3) Workflow IA reorg
3. `BSH-051` (2) Inline helper guidance
4. `BSH-052` (2) Summary/details + warning stack
5. `BSH-053` (2) Advanced deprioritization
6. `BSH-060` (3) Route decomposition
7. `BSH-061` (2) Drafting decomposition
8. `BSH-062` (2) Export/report module extraction
9. `BSH-063` (1) LOC enforcement hard gate

## Sprint 4 (18 pts): Regression Hardening + Signoff
1. `BSH-033` (2) Visual regression snapshots
2. `BSH-070` (3) Golden fixtures restore
3. `BSH-071` (4) Solver regression tests
4. `BSH-072` (4) Bushing smoke e2e
5. `BSH-073` (3) Release readiness checklist
6. reserve (2)

## Ready-to-Start Sequence
- Start with: `BSH-000` -> `BSH-001` -> `BSH-010` -> `BSH-011` -> `BSH-012` -> `BSH-020` -> `BSH-021`
