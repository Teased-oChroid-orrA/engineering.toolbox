# Surface Toolbox Plan v3 Implementation Pack

This folder contains execution-ready planning artifacts for implementing Surface Toolbox Plan v3.

## Contents
- `capacity-assumptions.md`: Team model and point budget assumptions.
- `dependency-dag.md`: Epic-level and critical-path dependencies.
- `sprint-allocation.md`: 2-week sprint plan with point loading.
- `task-board.md`: Board view grouped by milestone.
- `ticket-index.csv`: Flat index of all tickets with estimates/dependencies.
- `tickets/`: One issue-sized markdown file per ticket.

## Working Rules (Anti-Bloat)
- Core Mode default ON at first run.
- Advanced collapsed on fresh app launch.
- Within-session workspace panel state is remembered.
- No top-level control growth without explicit Core/Advanced review.
- Centralized module/source-of-truth policy must be enforced first.

## Centralized Source of Truth Requirement
Implementation must start by creating a single architecture manifest in app code:
- `src/lib/surface/SurfaceArchitectureManifest.ts`

This manifest is the canonical registry for:
- module ownership boundaries
- allowed layer imports
- public contracts
- controller wiring map

All major implementation tickets should reference this file before feature wiring.
