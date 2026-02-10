# Surface Acceptance Dataset Pack

This pack provides deterministic inputs and golden outputs for Surface toolbox slicing/export validation.

## Structure

- `datasets/<case>/input.json`: canonical case input
- `datasets/<case>/golden.csv`: expected combined CSV export (required columns)
- `datasets/<case>/golden.sidecar.json`: expected JSON sidecar metadata

## Cases

1. `plane_dense`
- Dense point cloud on a datum-normal slicing axis.
- Expected behavior: stable slices, no hard failures.

2. `sparse_band`
- Sparse cloud with narrow thickness and fractional spacing.
- Expected behavior: sparse/empty slice warnings and discontinuity warning.

## Verification

Run:

- `npm run verify:surface-acceptance-pack`

This checks pack completeness and golden output schemas.
