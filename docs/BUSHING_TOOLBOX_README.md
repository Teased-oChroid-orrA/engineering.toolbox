# Bushing Toolbox - User and Engineering README

## 1. Purpose
The Bushing Toolbox solves an interference-fit bushing/housing design from geometry, materials, process limits, and tolerance requirements.

It provides:
- fit/tolerance closure (`OD`, achieved interference band)
- stress and margin checks (Lamé-based thick-cylinder model)
- edge-distance and wall-thickness checks
- 2D/3D drafting views and report/export outputs

## 2. Main Workflow (User)
1. Set **Units**, **Materials**, and baseline geometry.
2. Enter bore and interference tolerances in either:
- `Nominal +/- Tol`
- `Lower / Upper`
3. Configure process controls (`dT`, friction, axial end constraint).
4. If interference limits are critical, enable strict policy in **Tolerance Priority Controls**.
5. Review:
- `Interference (target tol)`
- `Interference (achieved tol)`
- `OD (tol)`
- enforcement status/reason codes

## 3. Card Layout / Reordering
You can reorder all main cards from the **Card Layout** panel.

- Left column cards:
- `Header`
- `Helper Guidance`
- `Setup`
- `Geometry`
- `Profile + Settings`
- `Process / Limits`

- Right column cards:
- `Drafting View`
- `Results Summary`
- `Diagnostics`

Use `Up` / `Down` buttons per card. Layout persists in local storage key:
- `scd.bushing.layout.v1`

## 4. Inputs and Meanings
### 4.1 Bore / Interference tolerance inputs
- Bore defines housing hole variability.
- Interference target defines required assembly interference window.

For containment to be feasible across full tolerance stack-up, solver requires compatible widths:
- Bore width `<=` target interference width

### 4.2 Thermal and friction
- `dT` shifts effective interference via thermal expansion mismatch.
- Friction affects install force, not nominal OD directly.

### 4.3 Axial end constraint
- `free`, `one_end`, `both_ends`
- changes axial stress coupling in physics output.

## 5. Tolerance Priority Controls (Critical Section)
Controls:
- `Enforce Interference Tolerance`
- `Lock Bore (Reamer Fixed)`
- `Preserve Bore Nominal`
- `Allow Bore Nominal Shift`
- `Max Bore Nominal Shift`
- `Bore Capability Mode` (`unspecified`, `reamer_fixed`, `adjustable`)
- `Min Achievable Bore Tol Width`
- `Max Recommended Bore Tol Width`
- `Preferred IT Class`

## 6. How Auto-Adjust Works
When strict enforcement is enabled, solver tries to keep achieved interference fully inside requested limits.

### 6.1 Decision path
1. Compute bore and target interference ranges.
2. Compute feasible OD range from stack-up.
3. If infeasible and enforcement disabled:
- report infeasible/clamped behavior.
4. If infeasible and enforcement enabled:
- if bore is locked: blocked
- else try reducing bore tolerance width to target width
- if capability floor blocks that reduction: blocked

### 6.2 Key rule
If bore width is wider than target interference width, full containment is impossible unless bore width is tightened.

### 6.3 Reamer-fixed behavior
If `Bore Capability Mode = reamer_fixed`, lock is forced on and auto-adjust of bore width is blocked by policy.

## 7. How To Use Auto-Adjust To Meet Tolerance Requirement
Recommended procedure:
1. Set the required interference band exactly (min/max or nominal + tol).
2. Enable `Enforce Interference Tolerance`.
3. If tooling allows bore tolerance changes:
- disable `Lock Bore`
- keep `Preserve Bore Nominal = true` unless nominal changes are permitted.
4. Enter process capability floor (`Min Achievable Bore Tol Width`).
5. Solve and verify:
- `Interference Enforcement: satisfied`
- `Interference (achieved tol)` within `Interference (target tol)`

If status is blocked:
- reduce requested tightness (wider interference band), or
- improve bore process capability, or
- allow nominal strategy changes (if allowed by manufacturing policy).

## 8. Outputs and Diagnostics
### 8.1 Fit and tolerance outputs
- `OD (tol)` = solver-selected bushing OD range
- `Interference (target tol)` = requested range
- `Interference (achieved tol)` = actual stack-up result

### 8.2 Enforcement diagnostics
- `enabled`, `satisfied`, `blocked`
- reason codes (for machine-readable explainability)
- required vs available bore width
- lower/upper containment violations

### 8.3 Stress and margins
- contact pressure
- hoop and axial stress
- install force
- housing/bushing margins
- governing check and warnings

## 9. Why OD Can Be Clamped
When nominal OD implied by inputs would push achieved interference outside target bounds, solver clamps nominal OD into feasible interval.

UI intentionally shows a single clamp message (duplicate note is removed).

## 10. Drafting and 3D Behavior
- Section mode supports pan/zoom and pick-centering.
- 3D mode supports optional rotate-drag.
- Housing is rendered as an extruded section body.
- Bushing body is rendered as a revolved geometry.

## 11. Exports
- SVG/PDF via export controller.
- PDF path uses fallback handling when popup flows are unavailable.

## 12. Persistence
- Inputs key: `scd.bushing.inputs.v15`
- Layout key: `scd.bushing.layout.v1`
- Renderer preference key: `scd.bushing.legacyRenderer`
- Trace preference key: `scd.bushing.traceEnabled`

## 13. Internal Architecture (Code Map)
- Orchestration/UI:
- `src/lib/components/bushing/BushingOrchestrator.svelte`
- `src/lib/components/bushing/BushingResultSummary.svelte`
- `src/lib/components/bushing/BushingInterferencePolicyControls.svelte`

- Core solver:
- `src/lib/core/bushing/solve.ts` (entry)
- `src/lib/core/bushing/solveEngine.ts` (state + output assembly)
- `src/lib/core/bushing/solveMath.ts` (tolerance/math helpers)
- `src/lib/core/bushing/normalize.ts`
- `src/lib/core/bushing/schema.ts`
- `src/lib/core/bushing/types.ts`

- Drafting/Babylon:
- `src/lib/drafting/bushing/BushingBabylonRuntime.ts`
- `src/lib/drafting/bushing/BushingBabylonSceneMeshes.ts`
- `src/lib/drafting/bushing/BushingBabylonMaterials.ts`
- `src/lib/drafting/bushing/BushingBabylonView.ts`
- `src/lib/drafting/bushing/BushingBabylonShared.ts`

## 14. Validation Commands
- `npm run -s verify:bushing-solver`
- `npm run -s verify:bushing-e2e-smoke`
- `npm run -s check`

## 15. Troubleshooting Quick Table
- `Enforcement blocked / bore locked`
- Cause: lock active or reamer fixed mode
- Action: unlock only if manufacturing permits

- `Enforcement blocked / capability floor`
- Cause: requested band tighter than process floor
- Action: relax interference band or improve process capability

- `TOLERANCE_INFEASIBLE`
- Cause: bore width exceeds target interference width
- Action: tighten bore tolerance or widen target band

- `NET_CLEARANCE_FIT`
- Cause: effective interference <= 0 after thermal effects
- Action: revise nominal interference and/or thermal envelope
