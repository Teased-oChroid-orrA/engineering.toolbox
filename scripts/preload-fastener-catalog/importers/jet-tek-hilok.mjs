import path from 'node:path';
import {
  buildCatalogArtifact,
  buildStandardGripTable,
  fetchHtml,
  normalizeUrl,
  readJsonSource
} from './adapter.mjs';

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function parseJetTekTableRows(html) {
  const rows = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripHtml(cell[1]));
    if (cells.length >= 5) rows.push(cells);
  }
  return rows;
}

function mapJetTekMaterial(materialText, fallbackId) {
  const text = materialText.toLowerCase();
  if (text.includes('a286')) return 'a286';
  if (text.includes('mp35n')) return 'mp35n';
  if (text.includes('inconel 718')) return 'inconel718';
  if (text.includes('alloy steel') || text.includes('4340')) return 'steel4340';
  if (text.includes('titanium')) return 'ti6al4v';
  return fallbackId;
}

export async function importJetTekHiLokStandardConfig({ sourcePath }) {
  const raw = await readJsonSource(sourcePath);
  let discoveredSeriesUrls = new Map();
  let liveDiscoveryNote = 'fixture_only';
  let liveTableRows = new Map();
  try {
    const html = await fetchHtml(raw.sourceUrl);
    discoveredSeriesUrls = extractJetTekSeriesLinks(html, raw.sourceUrl);
    for (const [id, url] of [...discoveredSeriesUrls.entries()].slice(0, 6)) {
      try {
        const seriesHtml = await fetchHtml(url);
        const rows = parseJetTekTableRows(seriesHtml);
        const matchingRow = rows.find((cells) => String(cells[0]).toUpperCase() === id);
        if (matchingRow) liveTableRows.set(id, matchingRow);
      } catch {
        // Fall back to fixture data for the specific series.
      }
    }
    if (discoveredSeriesUrls.size > 0) {
      liveDiscoveryNote = `live_html_tables:${liveTableRows.size};live_html_links:${discoveredSeriesUrls.size}`;
    }
  } catch (error) {
    liveDiscoveryNote = `live_html_failed:${error instanceof Error ? error.message : String(error)}`;
  }
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
    materialId: mapJetTekMaterial(liveTableRows.get(String(series.id).toUpperCase())?.[2] ?? '', String(series.materialId)),
    headStyle: String(liveTableRows.get(String(series.id).toUpperCase())?.[3] || series.headStyle),
    threadDetail: String(series.threadFamily),
    sourceUrl: String(discoveredSeriesUrls.get(String(series.id).toUpperCase()) || series.seriesUrl || raw.sourceUrl),
    notes: String(
      liveTableRows.get(String(series.id).toUpperCase())
        ? `${series.notes} Live HTML table parsed from Jet-Tek series page.`
        : series.notes
    ),
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
