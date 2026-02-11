# ADR BAB-015: Export Source of Truth During Babylon Migration

## Status
Accepted (2026-02-11)

## Decision
SVG/PDF export remains sourced from the existing drafting/export pipeline (`prepareBushingExportArtifacts` -> `renderDraftingSheetSvg`) while Babylon is rolled out for interactive viewport rendering.

## Context
- Babylon renderer is now fed by canonical section primitives and should not depend on legacy section view output.
- Export output is currently stable, tested, and contractually expected by downstream users.
- Migrating export and viewport rendering simultaneously increases regression surface.

## Consequences
- Interactive draft engine can switch to Babylon without altering export byteshape.
- Export behavior remains deterministic across `draftEngine=svg|babylon`.
- A future ADR can revisit Babylon-native export snapshots after parity and baseline coverage are complete.

## Validation
- Added compatibility tests in `tests/bushing-export-babylon-compat.spec.ts`.
- Regression includes Babylon smoke toggle coverage in `tests/bushing-e2e-smoke-ui.spec.ts`.
