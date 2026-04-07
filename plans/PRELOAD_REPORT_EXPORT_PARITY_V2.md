# Preload Report/Export Parity V2

## Goal
Bring the preload equation-sheet / PDF export up to parity with the current preload route and solver features.

## Scope
- Extend the report with first-class compare-pack sections for installed preload, thermal, friction, and preload-loss cases.
- Add an inverse-target table that includes separation and fatigue targets alongside the existing targets.
- Render the staged load-transfer progression as a readable report section instead of leaving it implicit in the route only.
- Keep route code unchanged in this pass.

## Execution Steps
1. Add report helpers that derive compare packs and inverse targets from the existing solver output.
2. Expand the report HTML with dedicated sections for compare packs, inverse targets, and load-transfer progression.
3. Update solver/report tests to assert the new report content.
4. Run targeted preload solver and report verification.

## Definition of Done
- The equation-sheet export contains the new compare-pack content and inverse targets.
- The staged load-transfer progression is visible in the exported HTML.
- Targeted tests pass and no unrelated files are reverted.
