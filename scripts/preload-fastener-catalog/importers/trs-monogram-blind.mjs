import path from 'node:path';
import { buildCatalogArtifact, normalizeUrl, readJsonSource, readOptionalTextSource } from './adapter.mjs';

function extractTrsPartLinks(html, baseUrl, partPrefixes) {
  const discovered = new Map();
  const hrefMatches = [...html.matchAll(/href=["']([^"']+)["']/gi)];
  for (const match of hrefMatches) {
    const absolute = normalizeUrl(baseUrl, match[1]);
    if (!absolute) continue;
    const upper = absolute.toUpperCase();
    for (const prefix of partPrefixes) {
      if (upper.includes(prefix.toUpperCase())) {
        discovered.set(prefix.toUpperCase(), absolute);
      }
    }
  }
  return discovered;
}

export async function importTrsMonogramBlindConfig({ sourcePath }) {
  const raw = await readJsonSource(sourcePath);
  let discoveredPartLinks = new Map();
  let liveDiscovery = 'fixture_fallback';
  if (raw.htmlSnapshot) {
    const htmlPath = path.resolve(path.dirname(sourcePath), raw.htmlSnapshot);
    const html = await readOptionalTextSource(htmlPath);
    if (html) {
    discoveredPartLinks = extractTrsPartLinks(
      html,
      raw.sourceUrl,
      raw.rows.map((row) => String(row.partPrefix))
    );
      liveDiscovery = discoveredPartLinks.size ? `local_html_snapshot_links:${discoveredPartLinks.size}` : 'local_html_snapshot_links:0';
    } else {
      liveDiscovery = 'fixture_fallback:no_snapshot';
    }
  }
  const entries = raw.rows.map((row) => ({
    id: String(row.partPrefix),
    materialId: String(row.materialId),
    headStyle: String(row.headStyle),
    threadDetail: String(row.threadFamily),
    sourceUrl: String(discoveredPartLinks.get(String(row.partPrefix).toUpperCase()) || raw.sourceUrl),
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
      referenceOnly: true,
      liveDiscovery
    }
  });
}
