# Bushing Upgrades Beast Mode Plan

## Scope
- Add scenario compare support to the bushing workflow.
- Add preset and persistence support for reamer-focused fit decisions.
- Add a CSV import path for aerospace/aircraft reamer sizes and tolerances.

## Execution
1. Add a bushing reamer catalog core module for CSV parsing, selection, and scenario synthesis.
2. Persist loaded reamer catalog state in the existing bushing workspace store.
3. Add a process-panel import/selection UI for loading and applying catalog rows.
4. Add a compare panel in the results view that shows the current case against preset/catalog scenarios.
5. Add a curated aerospace CSV in `static/` and wire a sample-load action to it.

## Verification
- Run `npx svelte-check --tsconfig ./tsconfig.json`.
- Run targeted bushing Playwright specs for workspace persistence and the new catalog/import flow.
- Run the narrowest relevant smoke tests for the bushing route.

## Definition Of Done
- The loaded CSV can be imported, persisted, and used to drive reamer-fixed fit decisions.
- Scenario compare is visible in the bushing UI and reflects preset/catalog variants.
- Validation passes without touching inspector files.
