# Bushing Toolbox Dependency DAG (Implementation Ready)

## Foundation
- `BSH-000` -> `BSH-001`

## Data Contract Chain
- `BSH-010` -> `BSH-011` -> `BSH-012`

## Solver-Authoritative Drafting Chain
- `BSH-012` -> `BSH-020` -> `BSH-021` -> `BSH-022`

## D3 Sketch System Chain
- `BSH-021` -> `BSH-030` -> `BSH-031` -> `BSH-032` -> `BSH-033`

## Visual Modernization Chain
- `BSH-040` -> `BSH-041` -> `BSH-042` -> `BSH-043`

## IA/UX Reorganization Chain
- `BSH-021` -> `BSH-050` -> `BSH-051` -> `BSH-052` -> `BSH-053`

## Decomposition + LOC Enforcement Chain
- `BSH-050` -> `BSH-060` -> `BSH-061` -> `BSH-062` -> `BSH-063`

## Test/Release Chain
- `BSH-022` -> `BSH-070` -> `BSH-071` -> `BSH-072` -> `BSH-073`

## Parallelizable Tracks
- Track A: `BSH-040..043`
- Track B: `BSH-050..053`
- Track C: `BSH-070..073`

Constraint: Track B should not merge before `BSH-020/021` to avoid rebase churn in route wiring.
