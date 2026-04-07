# Bushing First-Class Implementation Plan V1

## Objective
- Expand the bushing toolbox from a fit/install calculator into a broader engineering workflow covering service-state, duty screening, process routing, approval traceability, and machine-readable export.

## Workstreams
1. Core engineering model
- Add typed service envelope, duty/tribology screening, process-route defaults, and approval traceability fields.
- Extend solver outputs and warnings to surface those results directly.

2. Workflow and UX
- Surface service, process, and approval inputs as first-class workflow sections.
- Upgrade the results view to show a staged service envelope, duty risk, and approval snapshot.

3. Export and persistence
- Carry the new engineering data through PDF/JSON export and persisted workspace state.

4. Verification
- Add solver and UI checks around the new envelope and workflow features.

## Definition Of Done
- New service/process/approval workflows are visible and usable in the bushing UI.
- The solver returns typed envelope, duty, process, and review results.
- Export includes the new engineering context.
- Targeted checks pass.
