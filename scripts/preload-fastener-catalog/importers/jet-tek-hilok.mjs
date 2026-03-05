import path from 'node:path';
import {
  buildCatalogArtifact,
  buildStandardGripTable,
  normalizeUrl,
  readOptionalTextSource,
  readJsonSource
} from './adapter.mjs';

function extractJetTekSeriesLinks(html, baseUrl) {
  const matches = [...html.matchAll(/href=["']([^"']*\/hl\d+\/?)["']/gi)];
  const urlMap = new Map();
  for (const match of matches) {
    const absolute = normalizeUrl(baseUrl, match[1]);
    if (!absolute) continue;
    const idMatch = absolute.match(/\/(hl\d+)\/?$/i);
    if (!idMatch) continue;
    urlMap.set(idMatch[1].toUpperCase(), absolute);
  }
  return urlMap;
}

export async function importJetTekHiLokStandardConfig({ sourcePath }) {
  const raw = await readJsonSource(sourcePath);
  let discoveredSeriesUrls = new Map();
  let liveDiscoveryNote = 'fixture_fallback';
  if (raw.htmlSnapshot) {
    const htmlPath = path.resolve(path.dirname(sourcePath), raw.htmlSnapshot);
    const html = await readOptionalTextSource(htmlPath);
    if (html) {
    discoveredSeriesUrls = extractJetTekSeriesLinks(html, raw.sourceUrl);
      liveDiscoveryNote = discoveredSeriesUrls.size
        ? `local_html_snapshot_links:${discoveredSeriesUrls.size}`
        : 'local_html_snapshot_links:0';
    } else {
      liveDiscoveryNote = 'fixture_fallback:no_snapshot';
    }
  }
  const dashVariants = raw.dashVariants.map((variant) => ({
    dash: String(variant.dash),
    nominalDiameterIn: Number(variant.nominalDiameterIn),
    threadCallout: String(variant.threadCallout),
    gripVariation: '1/16 in grip variation',
    collarPart: String(variant.collarPart),
    geometry: {
      headFaceDiametersIn: {
        protrudingShear: Number(variant.headFaceProtrudingShearIn ?? 0),
        reducedFlushShear: Number(variant.headFaceReducedFlushShearIn ?? 0),
        protrudingTension: Number(variant.headFaceProtrudingTensionIn ?? 0),
        flushTension: Number(variant.headFaceFlushTensionIn ?? 0)
      },
      nutFaceDiameterIn: Number(variant.nutFaceDiameterIn ?? 0),
      washerOuterDiameterIn: Number(variant.washerOuterDiameterIn ?? 0),
      washerInnerDiameterIn: Number(variant.washerInnerDiameterIn ?? 0),
      collarOuterDiameterIn: Number(variant.collarOuterDiameterIn ?? 0)
    }
  }));

  const gripTable = buildStandardGripTable(raw.gripCodes);

  const entries = raw.series.map((series) => ({
    id: String(series.id),
    materialId: String(series.materialId),
    headStyle: String(series.headStyle),
    threadDetail: String(series.threadFamily),
    sourceUrl: String(discoveredSeriesUrls.get(String(series.id).toUpperCase()) || series.seriesUrl || raw.sourceUrl),
    notes: String(series.notes),
    materialIsAssumed: Boolean(series.materialIsAssumed)
  }));
  return buildCatalogArtifact({
    manufacturer: raw.manufacturer,
    family: raw.seriesFamily,
    sourceUrl: raw.sourceUrl,
    sourcePath: path.basename(sourcePath),
    entries,
    dashVariants,
    gripTable,
    metadata: {
      liveDiscovery: liveDiscoveryNote
    }
  });
}
