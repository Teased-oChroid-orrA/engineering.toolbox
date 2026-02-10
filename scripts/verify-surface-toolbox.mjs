#!/usr/bin/env node
/**
 * SurfaceToolbox verification gate (A+B+C)
 *
 * A) Static feature contract: scripts/feature-contract-surface-toolbox.mjs
 * B) Architecture guard: scripts/verify-surface-architecture.mjs
 * C) Smoke build: svelte-check + vite build (catches syntax + block/tag issues)
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// A) Contract
run('node', [path.join(repoRoot, 'scripts/feature-contract-surface-toolbox.mjs')]);

// B) Architecture guard
run('node', [path.join(repoRoot, 'scripts/verify-surface-architecture.mjs')]);

// C) Acceptance dataset pack
run('node', [path.join(repoRoot, 'scripts/verify-surface-acceptance-pack.mjs')]);

// D) Geometry regression tolerance
run('node', [path.join(repoRoot, 'scripts/verify-surface-regression.mjs')]);

// E) Release-readiness gate (includes optional e2e toggle)
run('node', [path.join(repoRoot, 'scripts/verify-surface-release-readiness.mjs')]);

// F) Smoke: sync + svelte-check + build
run('npm', ['run', 'check']);
run('npm', ['run', 'build']);

console.log('\n[OK] SurfaceToolbox verification gate passed.');
