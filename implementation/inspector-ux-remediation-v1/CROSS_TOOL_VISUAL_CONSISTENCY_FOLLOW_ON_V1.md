# Cross-Tool Visual Consistency Follow-On v1

Date: 2026-02-10

## Scope executed
- Standardized motion-depth class usage across Surface and Bushing pop-card systems.
- Added enforcement script for depth-class presence when `*-pop-card` / `*-pop-sub` classes are used.

## Completed items
- Surface depth tiers applied in `SurfaceOrchestrator.svelte`:
  - primary pop cards -> `surface-depth-2`
  - nested/compact controls -> `surface-depth-1`
- Bushing depth tiers applied in:
  - `BushingOrchestrator.svelte`
  - `BushingResultSummary.svelte`
  - `BushingDiagnosticsPanel.svelte`
  - `BushingHelperGuidance.svelte`
- Added verification script:
  - `scripts/verify-cross-tool-motion-depth.mjs`
- Added package script:
  - `verify:motion-depth`

## Verification
- `node ./scripts/verify-cross-tool-motion-depth.mjs` -> OK
- `npm run -s check` -> run after integration (recommended in normal flow)

