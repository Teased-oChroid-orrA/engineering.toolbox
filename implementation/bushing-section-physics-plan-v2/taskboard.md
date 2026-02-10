# Taskboard (Issue-Sized)

Legend:
- Estimate: `S` (0.5-1 day), `M` (1-2 days), `L` (2-4 days)
- Status: `Ready`, `Blocked`, `Depends`

## Gate 0
1. `BSH-100` Runtime-path integrity + stale module detector
Estimate: S
Depends: none
Status: Ready

2. `BSH-101` Snapshot baseline for section view and result cards
Estimate: S
Depends: BSH-100
Status: Depends

3. `BSH-102` Numeric trace logger (input -> normalized -> solved -> rendered)
Estimate: M
Depends: BSH-100
Status: Depends

## Gate 1
4. `BSH-103` Canonical 2D section profile schema (points/lines/arcs)
Estimate: M
Depends: BSH-102
Status: Depends

5. `BSH-104` Material/void region extraction from closed loops
Estimate: M
Depends: BSH-103
Status: Depends

6. `BSH-105` Dynamic profile builder (straight/flanged/countersink)
Estimate: L
Depends: BSH-103
Status: Depends

7. `BSH-106` Section plane semantics + label contract
Estimate: S
Depends: BSH-105
Status: Depends

## Gate 2
8. `BSH-107` Layered section renderer rebuild
Estimate: L
Depends: BSH-104, BSH-105
Status: Depends

9. `BSH-108` Hatch engine with drafting rules
Estimate: M
Depends: BSH-107
Status: Depends

10. `BSH-109` Annotation collision avoidance + contain-fit viewport
Estimate: M
Depends: BSH-107
Status: Depends

11. `BSH-110` Legacy vs section mode contract cleanup
Estimate: S
Depends: BSH-107
Status: Depends

## Gate 3
12. `BSH-111` Formula inventory map + unit dimensions table
Estimate: M
Depends: BSH-102
Status: Depends

13. `BSH-112` Press-fit/interference pressure verification
Estimate: L
Depends: BSH-111
Status: Depends

14. `BSH-113` Hoop stress + margin verification
Estimate: M
Depends: BSH-112
Status: Depends

15. `BSH-114` Edge-distance/sequencing model verification
Estimate: M
Depends: BSH-111
Status: Depends

16. `BSH-115` Countersink solve consistency checks
Estimate: M
Depends: BSH-111
Status: Depends

## Gate 4
17. `BSH-116` Compute memoization/invalidation boundaries
Estimate: M
Depends: BSH-107, BSH-112
Status: Depends

18. `BSH-117` Render diffing/minimal redraw
Estimate: M
Depends: BSH-107
Status: Depends

19. `BSH-118` Input throughput tuning (live updates, no lag)
Estimate: S
Depends: BSH-116
Status: Depends

## Gate 5
20. `BSH-119` Golden dataset pack and expected outputs
Estimate: M
Depends: BSH-110, BSH-113, BSH-114, BSH-115
Status: Depends

21. `BSH-120` End-to-end smoke and export parity tests
Estimate: M
Depends: BSH-119
Status: Depends

22. `BSH-121` Release readiness + rollback runbook
Estimate: S
Depends: BSH-120
Status: Depends

## Recommended implementation sequence
BSH-100 -> BSH-101 -> BSH-102 -> BSH-103 -> BSH-104 -> BSH-105 -> BSH-106 -> BSH-107 -> BSH-108 -> BSH-109 -> BSH-110 -> BSH-111 -> BSH-112 -> BSH-113 -> BSH-114 -> BSH-115 -> BSH-116 -> BSH-117 -> BSH-118 -> BSH-119 -> BSH-120 -> BSH-121
