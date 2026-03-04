import path from 'node:path';
import { buildCatalogArtifact, readJsonSource } from './adapter.mjs';

export async function importTrsMonogramBlindConfig({ sourcePath }) {
  const raw = await readJsonSource(sourcePath);
  const entries = raw.rows.map((row) => ({
    id: String(row.partPrefix),
    materialId: String(row.materialId),
    headStyle: String(row.headStyle),
    threadDetail: String(row.threadFamily),
    sourceUrl: String(raw.sourceUrl),
    notes: `${String(row.description)}. ${String(row.notes)}`.trim(),
    materialIsAssumed: false
  }));

  return buildCatalogArtifact({
    manufacturer: raw.manufacturer,
    family: raw.seriesFamily,
    sourceUrl: raw.sourceUrl,
    sourcePath: path.basename(sourcePath),
    entries,
    dashVariants: [],
    gripTable: [],
    metadata: {
      adapter: 'trs_monogram_blind',
      referenceOnly: true
    }
  });
}
