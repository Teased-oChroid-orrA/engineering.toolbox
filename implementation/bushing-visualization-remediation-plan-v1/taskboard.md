# Taskboard (Issue-Sized)

## Capacity Assumptions
- Team: 1 engineer + AI pair
- Sprint length: 2 weeks
- Capacity: 18 points/sprint

## Sprint A: Triage + Rebuild Core (18 pts)
1. `BSH-090` (2) Diagnostics harness for contrast/readability and viewport sanity
2. `BSH-091` (3) Semantic typography/color tokenization for result cards
3. `BSH-092` (2) Contrast-floor enforcement
4. `BSH-093` (4) Canonical assembly scene model
5. `BSH-094` (4) Deterministic assembly renderer
6. `BSH-095` (3) Center-lock contain-fit and clipping guards

## Sprint B: Stabilization + Release (16 pts)
1. `BSH-096` (2) Pop transform isolation for viewport
2. `BSH-097` (4) Visual snapshots for cards + assembly
3. `BSH-098` (4) Stress-run regression tests
4. `BSH-099` (2) Release readiness + rollback/fallback runbook
5. Reserve (4)

## Ready-to-Start Sequence
`BSH-090 -> BSH-091 -> BSH-092 -> BSH-093 -> BSH-094 -> BSH-095 -> BSH-096 -> BSH-097 -> BSH-098 -> BSH-099`
