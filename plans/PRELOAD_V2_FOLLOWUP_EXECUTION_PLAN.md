# Preload V2 Follow-Up Execution Plan

## Objective
Finish the remaining preload follow-up work without touching core solver behavior that is already stable:
- add report/export parity for the new compare packs and staged load-transfer view
- split the oversized preload route into smaller route-local helpers/components where it reduces risk
- keep inverse-target thresholds configurable from the UI, not hard-coded in logic
- reduce repeated compare-pack recomputation with memoization
- add screenshot and visual regression coverage for the new panels

## Scope
Primary files:
- `src/lib/core/preload/report.ts`
- `src/routes/preload/+page.svelte`
- `tests/preload-summary-screenshots.spec.ts`
- `tests/preload-ui.spec.ts`
- `tests/preload-solver.spec.ts`

## Execution Steps
1. Add report/export parity.
   - Extend equation-sheet/report output to describe the compare packs.
   - Include the staged load-transfer summary in the exported report.
   - Keep the existing export shape intact for older review workflows.
2. Reduce route complexity.
   - Extract route-local compare-pack view helpers into a small preload UI helper module.
   - Extract load-transfer stage formatting/render helpers if the route remains too large.
   - Preserve current selectors and visual structure during the split.
3. Add memoization and threshold controls.
   - Cache compare-pack solving by a stable input signature.
   - Expose inverse-target thresholds in the review UI as explicit design settings.
4. Extend visual verification.
   - Capture the compare-pack panel.
   - Capture the staged load-transfer panel.
   - Keep existing summary and influence-matrix captures unchanged.
5. Verify.
   - Run targeted preload solver tests.
   - Run preload UI tests.
   - Run preload screenshot tests.
   - Run `svelte-check`.

## Acceptance Criteria
- Report/export output names the new compare packs and staged load-transfer progression.
- The preload route remains functional after any extraction.
- Compare-pack solving is not recomputed unnecessarily on the same input.
- Inverse-target thresholds are user-visible and configurable.
- Screenshot coverage exists for the compare-pack and staged progression panels.
- All targeted preload tests pass.

## Risk Notes
- The preload route is already large; any extraction should be incremental and selector-stable.
- New report content should not break existing export commands or snapshot assumptions.
- Screenshot tests should use stable labels or headings, not positional selectors.
