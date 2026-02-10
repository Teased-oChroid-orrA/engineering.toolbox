# Bushing Visualization Remediation Plan v1

## Problem Statement
Current Bushing UI has two production-facing defects:
1. Metrics card text/value layers are visually crushed into dark backgrounds (readability failure).
2. Assembly visualization is non-credible (garbled oversized labels/shapes, broken framing).

## Goals
- Restore immediate readability for all core result cards.
- Rebuild assembly viewport rendering from a deterministic, center-locked geometry pipeline.
- Keep card pop/tilt treatment without moving or distorting inner visualization content.
- Protect with automated visual + regression gates.

## Non-Goals
- No new physics model changes.
- No workflow IA rework beyond readability/visualization stability.
- No cross-toolbox restyling in this pass.

## Gate 1: Readability Stabilization
- `BSH-090` Add diagnostics harness for UI contrast + typography legibility baselines.
- `BSH-091` Replace ad-hoc text colors with semantic card tokens (title, label, value, emphasis).
- `BSH-092` Enforce WCAG-oriented contrast floor for result cards and warning cards.

### Gate 1 Acceptance
- All result card labels/values are clearly legible against panel backgrounds.
- No near-black text on dark panels in metrics regions.

## Gate 2: Assembly Visualization Rebuild (From Ground Up)
- `BSH-093` Create canonical scene model (`geometry -> primitives`) with strict bounds metadata.
- `BSH-094` Create deterministic renderer with explicit layers: background/grid, housing, bushing, centerlines, annotations.
- `BSH-095` Add center-lock + contain-fit transform manager (`xMidYMid meet`) and clipping guards.
- `BSH-096` Isolate card pop transforms from inner SVG scene to prevent drift/distortion.

### Gate 2 Acceptance
- Visualization remains centered under card hover effects.
- No oversized text overlaps or garbage artifacts across straight/flanged/countersink modes.

## Gate 3: Quality Gates + Regression Safety
- `BSH-097` Add visual snapshots for cards and assembly viewport.
- `BSH-098` Add stress-run test for repeated recompute/render cycles and state transitions.
- `BSH-099` Release checklist, rollback plan, and feature-flag fallback path.

### Gate 3 Acceptance
- Snapshot suite passes on baseline fixtures.
- Regression chain passes in one command.
- Rollback path documented and testable.

## Risks and Mitigations
- Risk: CSS overrides reintroduce low contrast.
  - Mitigation: tokenized semantic classes + lint-style checks in diagnostics ticket.
- Risk: renderer regression under unusual inputs.
  - Mitigation: bounds guards + stress suite + fixture expansion.
- Risk: animation/pop causes viewport drift.
  - Mitigation: transform isolation wrapper and pointer-safe layout constraints.

## Exit Criteria
- All tickets `BSH-090..099` completed.
- Visual/solver/smoke checks green.
- Product owner signoff on screenshot parity and readability.
