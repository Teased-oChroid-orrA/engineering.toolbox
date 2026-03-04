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

const jetTekArtifact = await importJetTekHiLokStandardConfig({ sourcePath: jetTekSourcePath });
await writeFile(jetTekOutputPath, `${JSON.stringify(jetTekArtifact, null, 2)}\n`, 'utf8');
console.log(`[preload-catalog-import] Wrote ${jetTekOutputPath}`);

const trsArtifact = await importTrsMonogramBlindConfig({ sourcePath: trsSourcePath });
await writeFile(trsOutputPath, `${JSON.stringify(trsArtifact, null, 2)}\n`, 'utf8');
console.log(`[preload-catalog-import] Wrote ${trsOutputPath}`);
