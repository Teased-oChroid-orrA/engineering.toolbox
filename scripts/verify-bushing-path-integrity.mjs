import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'src/lib/drafting/bushing/bushingSceneModel.ts',
  'src/lib/drafting/bushing/bushingSceneRenderer.ts',
  'src/lib/drafting/bushing/BushingDrafting.svelte',
  'src/lib/components/bushing/BushingOrchestrator.svelte'
];

const importChecks = [
  {
    file: 'src/lib/components/bushing/BushingOrchestrator.svelte',
    mustContain: "$lib/drafting/bushing/bushingSceneModel"
  },
  {
    file: 'src/lib/drafting/bushing/BushingDrafting.svelte',
    mustContain: './bushingSceneModel'
  },
  {
    file: 'src/lib/drafting/bushing/generate.ts',
    mustContain: './bushingSceneModel'
  }
];

const forbiddenPathFragments = [
  '/drafting/bushing/BushingSceneModel',
  './BushingSceneModel',
  '$lib/drafting/bushing/BushingSceneModel'
];

function fail(message) {
  console.error(`[Bushing path integrity] FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`[Bushing path integrity] ${message}`);
}

for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) fail(`required file missing: ${rel}`);
}

for (const check of importChecks) {
  const abs = path.join(root, check.file);
  const src = fs.readFileSync(abs, 'utf8');
  if (!src.includes(check.mustContain)) {
    fail(`${check.file} must contain import path fragment: ${check.mustContain}`);
  }
}

const scanRoots = ['src/lib/components/bushing', 'src/lib/drafting/bushing', 'src/lib/core/bushing', 'tests'];
for (const scanRoot of scanRoots) {
  const full = path.join(root, scanRoot);
  if (!fs.existsSync(full)) continue;
  const stack = [full];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
      continue;
    }
    if (!/\.(ts|svelte|js)$/.test(current)) continue;
    const src = fs.readFileSync(current, 'utf8');
    for (const fragment of forbiddenPathFragments) {
      if (src.includes(fragment)) {
        fail(`forbidden import fragment "${fragment}" found in ${path.relative(root, current)}`);
      }
    }
  }
}

const sceneModelSource = fs.readFileSync(path.join(root, 'src/lib/drafting/bushing/bushingSceneModel.ts'), 'utf8');
if (!/export function buildBushingScene\s*\(/.test(sceneModelSource)) {
  fail('buildBushingScene export missing from bushingSceneModel.ts');
}
if (!/export const BUSHING_SCENE_MODULE_SENTINEL\s*=/.test(sceneModelSource)) {
  fail('BUSHING_SCENE_MODULE_SENTINEL export missing in bushingSceneModel.ts');
}
const sentinelMatch = sceneModelSource.match(/export const BUSHING_SCENE_MODULE_SENTINEL\s*=\s*`([^`]+)`/);
ok(`sentinel: ${sentinelMatch?.[1] ?? 'defined'}`);
if (!process.exitCode) ok('PASS');
