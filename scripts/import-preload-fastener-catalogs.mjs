import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importJetTekHiLokStandardConfig } from './preload-fastener-catalog/importers/jet-tek-hilok.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'scripts/preload-fastener-catalog/sources/jet-tek-hilok-standard-source.json');
const outputPath = path.join(repoRoot, 'src/lib/core/preload/catalogs/hilok-standard-config.json');

const artifact = await importJetTekHiLokStandardConfig({ sourcePath });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(`[preload-catalog-import] Wrote ${outputPath}`);
