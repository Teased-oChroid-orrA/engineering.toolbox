import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importJetTekHiLokStandardConfig } from './preload-fastener-catalog/importers/jet-tek-hilok.mjs';
import { importTrsMonogramBlindConfig } from './preload-fastener-catalog/importers/trs-monogram-blind.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const jetTekSourcePath = path.join(repoRoot, 'scripts/preload-fastener-catalog/sources/jet-tek-hilok-standard-source.json');
const jetTekOutputPath = path.join(repoRoot, 'src/lib/core/preload/catalogs/hilok-standard-config.json');
const trsSourcePath = path.join(repoRoot, 'scripts/preload-fastener-catalog/sources/trs-monogram-blind-source.json');
const trsOutputPath = path.join(repoRoot, 'src/lib/core/preload/catalogs/trs-monogram-blind-config.json');
const manifestOutputPath = path.join(repoRoot, 'src/lib/core/preload/catalogs/catalog-manifest.json');

const jetTekArtifact = await importJetTekHiLokStandardConfig({ sourcePath: jetTekSourcePath });
await writeFile(jetTekOutputPath, `${JSON.stringify(jetTekArtifact, null, 2)}\n`, 'utf8');
console.log(`[preload-catalog-import] Wrote ${jetTekOutputPath}`);

const trsArtifact = await importTrsMonogramBlindConfig({ sourcePath: trsSourcePath });
await writeFile(trsOutputPath, `${JSON.stringify(trsArtifact, null, 2)}\n`, 'utf8');
console.log(`[preload-catalog-import] Wrote ${trsOutputPath}`);

const manifest = {
  generatedAt: new Date().toISOString(),
  workflow: {
    mode: 'offline_only',
    steps: [
      'Drop or update vendor HTML snapshots under scripts/preload-fastener-catalog/sources/',
      'Update companion source JSON fixtures if needed',
      'Run npm run import:preload-catalogs'
    ]
  },
  artifacts: [
    {
      artifact: path.relative(repoRoot, jetTekOutputPath),
      sourceJson: path.relative(repoRoot, jetTekSourcePath),
      sourceSnapshot: 'scripts/preload-fastener-catalog/sources/jet-tek-hilok-overview.html',
      importedAt: jetTekArtifact.source.importedAt,
      provenance: jetTekArtifact.source.liveDiscovery,
      sourceUrl: jetTekArtifact.source.sourceUrl
    },
    {
      artifact: path.relative(repoRoot, trsOutputPath),
      sourceJson: path.relative(repoRoot, trsSourcePath),
      sourceSnapshot: 'scripts/preload-fastener-catalog/sources/trs-monogram-blind-overview.html',
      importedAt: trsArtifact.source.importedAt,
      provenance: trsArtifact.source.liveDiscovery,
      sourceUrl: trsArtifact.source.sourceUrl
    }
  ]
};

await writeFile(manifestOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[preload-catalog-import] Wrote ${manifestOutputPath}`);
