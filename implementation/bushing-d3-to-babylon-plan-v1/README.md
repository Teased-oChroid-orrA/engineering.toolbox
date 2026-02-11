# Bushing D3 to Babylon Plan V1

Implementation-ready migration plan for transitioning the Bushing toolbox rendering path from D3/SVG utilities to Babylon.js in gated batches of 10.

## Contents
- `PLAN.md`: full 30-gate migration specification and exit criteria.
- `taskboard.md`: execution board grouped by batch.
- `tickets/`: one ticket per gate (`BAB-001` .. `BAB-030`).

## Execution policy
- Run gates in order.
- Stop at each batch boundary and pass validation gates.
- Keep `npm run -s verify:bushing-regression` green at every batch boundary.
