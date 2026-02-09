#!/usr/bin/env node
/**
 * SurfaceToolbox verification gate (A+B)
 *
 * A) Static feature contract: scripts/feature-contract-surface-toolbox.mjs
 * B) Smoke build: svelte-check + vite build (catches syntax + block/tag issues)
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

// B) Smoke: sync + svelte-check + build
run('npm', ['run', 'check']);
run('npm', ['run', 'build']);

console.log('\n[OK] SurfaceToolbox verification gate passed.');
