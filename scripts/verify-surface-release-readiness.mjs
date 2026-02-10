#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function fail(msg) {
  console.error(`[surface-release] ${msg}`);
  process.exit(1);
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function ensureExists(rel) {
  const fp = path.join(repoRoot, rel);
  if (!fs.existsSync(fp)) fail(`required artifact missing: ${rel}`);
}

function main() {
  ensureExists('implementation/surface-toolbox-plan-v3/release-readiness.md');
  ensureExists('implementation/surface-toolbox-plan-v3/deferred-obj-stl-backlog.md');
  ensureExists('playwright.config.ts');
  ensureExists('tests/surface-smoke.spec.ts');

  run('node', ['scripts/verify-surface-acceptance-pack.mjs']);
  run('node', ['scripts/verify-surface-regression.mjs']);

  if (process.env.RUN_SURFACE_SMOKE_E2E === '1') {
    run('npx', ['playwright', 'test', 'tests/surface-smoke.spec.ts']);
  } else {
    console.log('[surface-release] Skipping e2e smoke run (set RUN_SURFACE_SMOKE_E2E=1 to enforce).');
  }

  console.log('[surface-release] Release readiness checks: OK (OBJ/STL remain deferred by backlog).');
}

main();
