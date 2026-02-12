# Migration and Rollback - Bushing DnD V3

## Persistence Migration
- source keys:
  - `scd.bushing.layout.v2`
  - `scd.bushing.layout.v2.diagnostics`
- destination keys:
  - `scd.bushing.layout.v3`
  - `scd.bushing.layout.v3.diagnostics`

Rules:
1. If v3 exists, use it.
2. Else attempt v2 read.
3. Normalize order against active card ids (drop unknown ids, append missing ids).
4. Persist normalized result to v3.
5. Do not write v2 again.

## Rollback Control
Feature flag:
- `scd.bushing.dnd.enabled`

When disabled:
- drag handles hidden
- order remains stable and persisted
- keyboard move controls remain available

## Operational Rollback Steps
1. Set `scd.bushing.dnd.enabled=false`.
2. Reload app and verify layout renders without drag interactions.
3. Confirm reorder via keyboard controls remains functional.
4. Capture defect telemetry before re-enabling flag.
