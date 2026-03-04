import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildStandardGripTable, validateCatalogArtifact } from './adapter.mjs';

export async function importJetTekHiLokStandardConfig({ sourcePath }) {
  const raw = JSON.parse(await readFile(sourcePath, 'utf8'));
  const dashVariants = raw.dashVariants.map((variant) => ({
    dash: String(variant.dash),
    nominalDiameterIn: Number(variant.nominalDiameterIn),
    threadCallout: String(variant.threadCallout),
    gripVariation: '1/16 in grip variation',
    collarPart: String(variant.collarPart)
  }));

  const gripTable = buildStandardGripTable(raw.gripCodes);

  const entries = raw.series.map((series) => ({
    id: String(series.id),
    materialId: String(series.materialId),
    headStyle: String(series.headStyle),
    threadDetail: String(series.threadFamily),
    sourceUrl: String(series.seriesUrl || raw.sourceUrl),
    notes: String(series.notes),
    materialIsAssumed: Boolean(series.materialIsAssumed)
  }));

  const artifact = {
    source: {
      manufacturer: raw.manufacturer,
      family: raw.seriesFamily,
      sourceUrl: raw.sourceUrl,
      importedAt: new Date().toISOString(),
      sourcePath: path.basename(sourcePath)
    },
    dashVariants,
    gripTable,
    entries
  };

  return validateCatalogArtifact(artifact);
}
