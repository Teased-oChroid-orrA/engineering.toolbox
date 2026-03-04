# Offline Preload Catalog Refresh

This importer is intentionally offline-only.

Workflow:
1. Drop or update vendor HTML snapshots in `scripts/preload-fastener-catalog/sources/`
2. Update the companion JSON fixture if the catalog family list changes
3. Run:

```bash
npm run import:preload-catalogs
```

Outputs:
- `src/lib/core/preload/catalogs/hilok-standard-config.json`
- `src/lib/core/preload/catalogs/trs-monogram-blind-config.json`
- `src/lib/core/preload/catalogs/catalog-manifest.json`

The generated manifest records:
- which snapshot file was used
- which JSON fixture was used
- the import timestamp
- the provenance mode (`local_html_snapshot_*` or `fixture_fallback*`)
