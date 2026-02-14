#!/usr/bin/env node
/**
 * Surface architecture guard (STB-002).
 *
 * Enforces:
 * - manifest validity and dependency graph sanity
 * - module existence
 * - module size limits (soft warn + hard fail)
 * - import dependency declarations against the manifest
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import ts from 'typescript';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifestPath = path.resolve(repoRoot, 'src/lib/surface/SurfaceArchitectureManifest.ts');

const MODULE_LOC_SOFT_LIMIT = 300;
const MODULE_LOC_HARD_LIMIT = 500;
const MODULE_SIZE_OVERRIDES = {
  // Temporary legacy allowance. Must be removed when STB-010 decomposition lands.
  'surface.toolbox': { soft: 300, hard: 600 },
  'surface.ui.orchestrator': { soft: 1800, hard: 3000 }
};

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function countLogicalLoc(src) {
  const withoutComments = stripComments(src);
  return withoutComments
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;
}

function parseImportSpecifiers(src) {
  const out = [];
  const importRe = /(?:^|\n)\s*import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  const sideEffectRe = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(src))) out.push(m[1]);
  while ((m = sideEffectRe.exec(src))) out.push(m[1]);
  return out;
}

function loadManifestExports(tsFilePath) {
  if (!fs.existsSync(tsFilePath)) fail(`[Surface architecture] manifest not found: ${tsFilePath}`);
  const src = fs.readFileSync(tsFilePath, 'utf8');
  const transpiled = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: tsFilePath
  }).outputText;

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: undefined,
    process: { env: {} }
  };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(transpiled, sandbox, { filename: tsFilePath });
  return sandbox.module.exports;
}

function resolveImportToRepoRelative(fromFileRel, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('$lib/')) return null;

  let abs;
  if (spec.startsWith('$lib/')) {
    abs = path.resolve(repoRoot, 'src/lib', spec.slice('$lib/'.length));
  } else {
    abs = path.resolve(repoRoot, path.dirname(fromFileRel), spec);
  }

  const candidates = [];
  const ext = path.extname(abs);
  if (ext) candidates.push(abs);
  else {
    candidates.push(`${abs}.ts`, `${abs}.js`, `${abs}.svelte`, path.join(abs, 'index.ts'), path.join(abs, 'index.js'));
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return toPosix(path.relative(repoRoot, c));
  }
  return null;
}

function main() {
  const {
    SURFACE_MODULES,
    SURFACE_LAYER_IMPORT_POLICY,
    validateSurfaceArchitectureManifest
  } = loadManifestExports(manifestPath);

  if (!Array.isArray(SURFACE_MODULES)) fail('[Surface architecture] SURFACE_MODULES is missing or invalid.');
  if (!SURFACE_LAYER_IMPORT_POLICY || typeof SURFACE_LAYER_IMPORT_POLICY !== 'object') {
    fail('[Surface architecture] SURFACE_LAYER_IMPORT_POLICY is missing or invalid.');
  }
  if (typeof validateSurfaceArchitectureManifest !== 'function') {
    fail('[Surface architecture] validateSurfaceArchitectureManifest() is missing.');
  }

  const structural = validateSurfaceArchitectureManifest(SURFACE_MODULES);
  if (!structural?.ok) {
    console.error('[Surface architecture] Manifest structural validation failed:');
    for (const e of structural?.errors ?? []) console.error(` - ${e}`);
    process.exit(1);
  }

  const byId = new Map(SURFACE_MODULES.map((m) => [m.id, m]));
  const byPath = new Map(SURFACE_MODULES.map((m) => [toPosix(m.path), m]));
  const errors = [];
  const warnings = [];

  for (const mod of SURFACE_MODULES) {
    const relPath = toPosix(mod.path);
    const absPath = path.resolve(repoRoot, relPath);
    if (!fs.existsSync(absPath)) {
      errors.push(`${mod.id}: file not found (${relPath})`);
      continue;
    }

    const src = fs.readFileSync(absPath, 'utf8');
    const loc = countLogicalLoc(src);
    const modSoftLimit = MODULE_SIZE_OVERRIDES[mod.id]?.soft ?? MODULE_LOC_SOFT_LIMIT;
    const modHardLimit = MODULE_SIZE_OVERRIDES[mod.id]?.hard ?? MODULE_LOC_HARD_LIMIT;
    if (loc > modHardLimit) {
      errors.push(`${mod.id}: ${loc} LOC exceeds hard limit ${modHardLimit} (${relPath})`);
    } else if (loc > modSoftLimit) {
      warnings.push(`${mod.id}: ${loc} LOC exceeds soft limit ${modSoftLimit} (${relPath})`);
    }

    const specs = parseImportSpecifiers(src);
    const actualDepIds = new Set();
    for (const spec of specs) {
      const depRel = resolveImportToRepoRelative(relPath, spec);
      if (!depRel) continue;
      const depMod = byPath.get(depRel);
      if (!depMod) continue;
      if (depMod.id !== mod.id) actualDepIds.add(depMod.id);
    }

    const declared = new Set(mod.dependsOn ?? []);

    for (const depId of actualDepIds) {
      if (!declared.has(depId)) {
        errors.push(`${mod.id}: undeclared dependency import -> ${depId}`);
      }
      const dep = byId.get(depId);
      if (dep) {
        const allowedLayers = SURFACE_LAYER_IMPORT_POLICY[mod.layer] ?? [];
        if (!allowedLayers.includes(dep.layer)) {
          errors.push(
            `${mod.id}: import layer violation (${mod.layer} -> ${dep.layer}) via ${dep.id}`
          );
        }
      }
    }
  }

  if (warnings.length) {
    console.log('[Surface architecture] Warnings:');
    for (const w of warnings) console.log(` - ${w}`);
  }

  if (errors.length) {
    console.error('\n[Surface architecture] FAILED checks:');
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }

  console.log('[Surface architecture] Checks: OK');
}

main();
