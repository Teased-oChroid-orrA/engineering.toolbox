# Gated Implementation Plan (v2)

## Problem
Current bushing visualization is not behaving like a real section view and appears stale/incorrect in runtime updates. Physics/calculation code also needs a formal formula audit and verification pass.

## Primary Outcomes
1. Section view visually matches drafting conventions and updates deterministically with input changes.
2. Formula chain is auditable, test-backed, and numerically stable.
3. Rendering + compute remain responsive under frequent parameter edits.

## Gate 0: Baseline and Instrumentation
Goal: establish trustworthy baseline before changing behavior.

Tickets:
- `BSH-100` Runtime-path integrity + stale module detector.
- `BSH-101` Snapshot baseline for section view and result cards.
- `BSH-102` Numeric trace logger (input -> normalized -> solved -> rendered).

Exit criteria:
- Any stale renderer or stale compute path is detected in tests.
- Existing behavior captured in golden snapshots for controlled diffing.

## Gate 1: Section Geometry Kernel (Source of Truth)
Goal: rebuild section geometry from connected profile entities instead of ad-hoc decorative polygons.

Tickets:
- `BSH-103` Canonical 2D section profile schema (points/lines/arcs, closed loops).
- `BSH-104` Material-region and void-region extraction from profile loops.
- `BSH-105` Dynamic profile builder for straight/flanged/countersink variants.
- `BSH-106` Section plane semantics and label placement contract.

Exit criteria:
- Scene is generated from closed-loop profiles only.
- Material regions are hatched; void regions are unhatched.
- Changing any relevant input updates profile topology deterministically.

## Gate 2: Drafting-Correct Rendering
Goal: render section like a technical drawing, not a stylized placeholder.

Tickets:
- `BSH-107` Layered renderer: cut solids, visible outlines, centerlines, dimensions, annotations.
- `BSH-108` Hatch engine with angle/spacing rules by material zone.
- `BSH-109` Annotation/leader collision avoidance and viewport fit.
- `BSH-110` Renderer mode contract cleanup (`legacy` vs `section`) with explicit visual diffs.

Exit criteria:
- Section mode is visually distinct from legacy mode.
- No oversized text overlap; no malformed polygons.
- Exported SVG/PDF matches viewport output.

## Gate 3: Physics/Formula Audit + Corrections
Goal: verify every equation in the bushing solver, including units and limits.

Tickets:
- `BSH-111` Formula inventory map (all equations with units and source tags).
- `BSH-112` Interference/press-fit pressure model verification and correction.
- `BSH-113` Hoop stress and safety-margin validation (housing + bushing).
- `BSH-114` Edge-distance/sequencing model verification and warning semantics.
- `BSH-115` Countersink geometry solve consistency checks (ID/OD modes).

Exit criteria:
- Each formula has unit tests and source references.
- Dimensional-analysis checks pass for all outputs.
- Warning levels (`info/warning/error`) match deterministic rules.

## Gate 4: Throughput and UX Responsiveness
Goal: keep editing interaction smooth while preserving correctness.

Tickets:
- `BSH-116` Compute memoization and invalidation boundaries.
- `BSH-117` Render diffing/minimal redraw for drafting SVG.
- `BSH-118` Input event throughput tuning (no stale summaries, no lag spikes).

Exit criteria:
- Result summary updates during input editing.
- No visible interaction stalls under rapid input changes.
- No runaway reactive loops.

## Gate 5: Regression, Release, and Rollback
Goal: protect behavior and ship safely.

Tickets:
- `BSH-119` Golden dataset pack + expected outputs (JSON/CSV/SVG).
- `BSH-120` End-to-end smoke suite for bushing toolbox flows.
- `BSH-121` Release readiness + rollback/feature-flag runbook.

Exit criteria:
- Regression suite green on baseline datasets.
- Visual and numeric goldens pass.
- Rollback path tested.

## Centralized source-of-truth policy
- Geometry source of truth: `src/lib/drafting/bushing/bushingSceneModel.ts`
- Renderer source of truth: `src/lib/drafting/bushing/bushingSceneRenderer.ts`
- Physics source of truth: `src/lib/core/bushing/solve.ts`
- UI orchestration source of truth: `src/lib/components/bushing/BushingOrchestrator.svelte`

No new module should exceed agreed soft limits; decompose as needed into focused controllers/builders.
