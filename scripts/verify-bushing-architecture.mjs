import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const manifestPath = path.join(root, 'src/lib/bushing/BushingArchitectureManifest.ts');
const text = fs.readFileSync(manifestPath, 'utf8');

const entryRe = /\{\s*path:\s*'([^']+)'\s*,\s*softMaxLoc:\s*(\d+)\s*,\s*required:\s*(true|false)\s*\}/g;
const entries = [];
let m;
while ((m = entryRe.exec(text))) {
  entries.push({
    path: m[1],
    softMaxLoc: Number(m[2]),
    required: m[3] === 'true'
  });
}

const failures = [];
const warnings = [];

for (const e of entries) {
  const abs = path.join(root, e.path);
  if (!fs.existsSync(abs)) {
    if (e.required) failures.push(`bushing.missing.required: ${e.path}`);
    continue;
  }
  const loc = fs.readFileSync(abs, 'utf8').split(/\r?\n/).length;
  if (loc > e.softMaxLoc) {
    // LOC violations are warnings, not failures
    warnings.push(`bushing.loc.soft_warn: ${loc} LOC exceeds soft limit ${e.softMaxLoc} (${e.path})`);
  }
}

if (failures.length) {
  console.error('[Bushing architecture] Failures:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

if (warnings.length) {
  console.log('[Bushing architecture] Warnings:');
  for (const w of warnings) console.log(` - ${w}`);
}

console.log('[Bushing architecture] Checks: OK');
