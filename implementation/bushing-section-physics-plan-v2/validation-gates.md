# Validation Gates

## Gate 0 checks
- `npm run -s check`
- Baseline snapshot command (new): `npm run -s test:bushing:visual-baseline`
- Runtime-path test (new): `npm run -s test:bushing:path-integrity`

Pass conditions:
- No missing module imports.
- Baseline snapshots generated and committed.

## Gate 1-2 checks (geometry + rendering)
- `npm run -s test:bushing:scene`
- `npm run -s test:bushing:section-render`
- `npm run -s test:bushing:export-parity`

Pass conditions:
- Closed-loop geometry validation passes.
- Section mode and legacy mode snapshots are visibly and structurally different.
- Exported SVG/PDF geometry matches viewport geometry data.

## Gate 3 checks (physics)
- `npm run -s test:bushing:physics-units`
- `npm run -s test:bushing:physics-regression`
- `npm run -s test:bushing:warnings`

Pass conditions:
- All formula tests pass with explicit unit assertions.
- No unexplained numeric regressions in golden dataset.
- Warning-level mapping is deterministic and documented.

## Gate 4 checks (performance)
- `npm run -s test:bushing:interaction-throughput`
- `npm run -s test:bushing:render-stress`

Pass conditions:
- No stale summary behavior under rapid edits.
- No frame-collapse behavior during high-frequency updates.

## Gate 5 checks (release)
- `npm run -s test:bushing:e2e-smoke`
- `npm run -s verify:bushing-regression`
- Manual checklist review in `release-readiness.md`

Pass conditions:
- E2E flows pass for straight/flanged/countersink variants.
- Regression suite is green.
- Rollback toggle validated.
