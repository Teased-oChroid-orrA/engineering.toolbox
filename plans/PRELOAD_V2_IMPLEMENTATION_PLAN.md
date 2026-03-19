# Preload V2 Improvement Plan

## Summary
Current Preload already has a solid base in `/Users/nautilus/Desktop/engineering.toolbox/src/routes/preload/+page.svelte` and `/Users/nautilus/Desktop/engineering.toolbox/src/lib/core/preload`: wizard flow, explicit torque/nut-factor/direct-preload installation modes, three compression models, preload retention, scatter envelopes, catalog-backed fastener/material data, pattern screening, and report/export.

The next phase should extend, not rebuild. The highest-value path is:

1. make the stiffness / preload-loss / uncertainty model more defensible
2. make the assembly model more physically explicit
3. turn results into design decisions instead of raw outputs
4. upgrade pattern screening into a true joint-level group solver
5. improve reports/UX only after the mechanics are strengthened

The plan below is ordered so each gate produces usable value on its own and does not block later gates unnecessarily.

## Key Interface / Type Changes
Implementation should extend the existing preload core types in `/Users/nautilus/Desktop/engineering.toolbox/src/lib/core/preload/types.ts`, not create a parallel solver model.

### New / changed types
- `CompressionModel`
  - keep:
    - `cylindrical_annulus`
    - `conical_frustum_annulus`
    - `explicit_area`
  - add:
    - `calibrated_vdi_equivalent`
- Replace `MemberSegmentInput` naming in UI-facing layers with plate/joint assembly terminology.
- Add `JointAssemblyInput` with explicit ordered stack.
- Add `PreloadLossBreakdown`.
- Add `InstallationUncertaintyModel`.
- Add `ThreadMechanicsResult`.
- Add `DesignVerdictResult`.
- Add `SensitivityResult`.
- Add `InverseSolveRequest` / `InverseSolveResult`.
- Extend group solver inputs/results for richer joint-level interaction.
- Add `ReportBundleResult`.

### Compatibility rules
- Keep existing `computeFastenedJointPreload()` entrypoint.
- Add optional new fields with safe defaults so current saved form state can migrate.
- Existing compression models remain available as explicit fast proxy modes.
- No external web calls; catalog/report improvements remain offline/snapshot-based.

## Gates and Tickets

## G0. Baseline Alignment and Migration Layer
Purpose: prepare the codebase for V2 without breaking the existing route.

### Tickets
- `G0-T1` Add a versioned preload workspace schema and migration layer for new fields.
- `G0-T2` Introduce canonical assembly/plate terminology while preserving backward compatibility with current `memberSegments`.
- `G0-T3` Add a single `preload.v2` feature flag block so new outputs can coexist with current cards during rollout.
- `G0-T4` Add model-basis metadata to results so UI/report can state exactly which mechanics model was active.

### Acceptance
- Existing saved preload sessions load without data loss.
- Existing wizard still runs with current defaults.
- Current tests remain green before deeper changes land.

## G1. Physics Accuracy Foundation
Purpose: address the current weakest mechanics areas first.

### Tickets
- `G1-T1` Add `calibrated_vdi_equivalent` compression model.
- `G1-T2` Replace current single scatter percent emphasis with structured installation uncertainty propagation.
- `G1-T3` Add explicit preload loss breakdown terms.
- `G1-T4` Add pre-separation / incipient-separation / post-separation state logic with explicit state transitions and slope changes.
- `G1-T5` Add result traces showing which terms materially changed effective preload and clamp retention.

### Parallelizable
- `G1-T2` and `G1-T3` can be built in parallel.
- `G1-T4` depends on the updated effective preload state from `G1-T3`.

### Acceptance
- User can switch among four compression models and see active basis clearly.
- Effective preload is shown as installed preload minus explicit named losses plus thermal shift.
- Separation behavior is shown in three states, not one binary flag.
- Existing nominal cases remain numerically stable within documented tolerance.

## G2. Thread and Bearing Mechanics Realism
Purpose: remove overly simplified thread/bearing assumptions.

### Tickets
- `G2-T1` Add engaged-thread effectiveness and thread load-distribution factor to strip/bearing calculations.
- `G2-T2` Distinguish internal and external thread governing location explicitly in solver and UI.
- `G2-T3` Replace generic under-head area emphasis with catalog-driven bearing geometry where available.
- `G2-T4` Add tapped-joint and collar-engagement variants to thread-bearing logic.
- `G2-T5` Show thread/bearing governing mode in checks and PDF with exact demand/capacity and formula basis.

### Acceptance
- Governing strip/bearing location is explicit and reproducible.
- Hi-Lok / nut / tapped-joint cases do not rely on one generic bearing simplification.
- Report shows exact bearing geometry source: catalog, derived, or manual override.

## G3. Assembly-Driven Modeling Realism
Purpose: move from generic segment inputs to explicit joint assembly modeling.

### Tickets
- `G3-T1` Introduce `JointAssemblyInput` as the canonical modeling layer.
- `G3-T2` Add joint-type presets.
- `G3-T3` Convert current plate-layer editing into ordered assembly rows.
- `G3-T4` Add plate behavior options.
- `G3-T5` Add dissimilar footprint realism.
- `G3-T6` Preserve current auto-derivation path, but derive rows from assembly presets instead of ad hoc duplicated fields.

### Acceptance
- User models the joint as an assembly, not a loose collection of unrelated segments.
- Current automatic row filling still works, but now maps into explicit assembly rows.
- Plate width/length remain rectangular footprint inputs, not diameter-surrogate concepts in the UI.

## G4. Decision Support and Failure Decomposition
Purpose: turn solver output into actionable engineering guidance.

### Tickets
- `G4-T1` Add a `Design Verdict` panel.
- `G4-T2` Add why-this-failed decomposition.
- `G4-T3` Add sensitivity ranking using bounded finite-difference perturbations.
- `G4-T4` Add inverse solving.
- `G4-T5` Add envelope mode.

### Acceptance
- Failed states no longer stop at warning; they explain cause and best next change.
- Sensitivity ranking identifies the top drivers quantitatively.
- Inverse solutions return explicit target values with feasibility notes.

## G5. Wizard and UX Consolidation
Purpose: reduce cognitive load and align the UI with engineering intent.

### Tickets
- `G5-T1` Keep the existing four-step wizard, but enforce literal single-step visibility with stronger gating.
- `G5-T2` Rename UI-facing solver jargon.
- `G5-T3` Add guided presets.
- `G5-T4` Extend remediation to all invalid and failed checks.
- `G5-T5` Add scenario compare.

### Acceptance
- Only the current step is visible by default.
- Advanced controls stay hidden until review/failure unless explicitly opened.
- Every failure card offers direct actions or targeted navigation.
- Scenario compare can reuse the same route state model without forking the app.

## G6. Visualization and Reporting Upgrade
Purpose: make the tool explain the load path, not just calculate it.

### Tickets
- `G6-T1` Add a load-path dashboard.
- `G6-T2` Upgrade the joint-section viewport.
- `G6-T3` Add equation traceability in PDF.
- `G6-T4` Add certification-style report sections.
- `G6-T5` Add export bundle generation.

### Acceptance
- The viewport can visually show nominal vs separated states and compressed-zone interpretation.
- PDF is traceable enough for audit review.
- Export bundle is reproducible from one command/action.

## G7. Fastener Group Solver Upgrade
Purpose: replace the current mechanics-based pattern screen with a clearer joint-level interaction model.

### Tickets
- `G7-T1` Preserve current row/pattern solver as `screening` mode.
- `G7-T2` Add `joint_interaction` group solver mode.
- `G7-T3` Add multiple load-case evaluation with case envelopes and governing fastener ranking.
- `G7-T4` Add redistribution / failure progression output.
- `G7-T5` Add joint-map visualization.
- `G7-T6` Add critical-fastener verdict integration into the main review flow.

### Acceptance
- User can choose between fast screening and fuller interaction mode.
- Group results identify governing fastener by case and across the envelope.
- Visualization shows coupling and redistribution, not only a single critical number.

## G8. Validation, Calibration, and Regression Hardening
Purpose: keep the richer solver trustworthy.

### Tickets
- `G8-T1` Add golden-case solver fixtures.
- `G8-T2` Add comparison fixtures for compression models, including the new calibrated mode.
- `G8-T3` Add scenario-based UI regressions.
- `G8-T4` Add group-solver regression pack.
- `G8-T5` Add report snapshot verification for PDF/SVG/CSV/JSON schema stability.

### Acceptance
- New mechanics features have deterministic reference coverage.
- UI and report changes do not silently drift.

## Recommended Execution Order
1. `G0` baseline alignment
2. `G1` preload-loss + uncertainty + separation-state accuracy
3. `G2` thread/bearing realism
4. `G3` assembly-driven modeling
5. `G4` design verdict + inverse solving + sensitivity
6. `G5` wizard/UX consolidation
7. `G6` visualization/report bundle upgrade
8. `G7` full fastener-group interaction
9. `G8` hardening across all prior gates

## Test Plan
### Core solver
- exact torque preload matches known decomposition cases
- preload-loss breakdown sums correctly to effective preload
- separation state transitions at the right load and post-separation slope
- thread-strip governing switches correctly between internal/external
- inverse solve converges and returns feasible/infeasible status correctly

### Assembly modeling
- preset-to-assembly mapping is deterministic
- washer/shim/interlayer rows affect stiffness and thermal terms correctly
- mixed-material and mixed-footprint assemblies preserve row order and inputs

### UX / workflow
- wizard blocks forward navigation until required fields are valid
- advanced stays hidden until review/failure unless explicitly opened
- every failure/remediation action either resolves the issue or focuses the relevant input
- compare mode shows deltas without mutating the base scenario unexpectedly

### Group solver
- screening and joint-interaction modes produce distinct labeled outputs
- case envelopes identify the correct governing fastener/case
- redistribution progression remains deterministic

### Reports / exports
- PDF contains governing equations, substitutions, verdicts, assumptions, and provenance
- SVG/CSV/JSON/screenshot bundle exports complete successfully
- export bundle contents are stable across regression fixtures

## Assumptions and Defaults
- Keep the existing `/preload` route and existing `computeFastenedJointPreload()` entrypoint.
- Keep current compression proxy models; add the calibrated model instead of replacing proxies.
- Keep offline catalog ingestion only; no live vendor calls.
- Keep the current pattern solver as a labeled screening mode for speed/backward compatibility.
- Use explicit, user-visible modeling choices everywhere; no hidden fallback assumptions.
- Prefer extending the current route/components over creating a second preload tool.
