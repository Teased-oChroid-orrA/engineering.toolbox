#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const packRoot = path.join(repoRoot, 'implementation', 'surface-toolbox-plan-v3', 'acceptance', 'datasets');

const REQUIRED_CASES = ['plane_dense', 'sparse_band'];
const REQUIRED_COLUMNS = ['slice_id', 'x', 'y', 'z'];

function fail(msg) {
  console.error(`[surface-acceptance] ${msg}`);
  process.exit(1);
}

function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function parseCsvHeader(csvText) {
  const line = csvText.split(/\r?\n/).find((l) => l.trim().length > 0);
  return line ? line.split(',').map((s) => s.trim()) : [];
}

function main() {
  if (!fs.existsSync(packRoot)) fail(`dataset root not found: ${packRoot}`);

  for (const c of REQUIRED_CASES) {
    const dir = path.join(packRoot, c);
    const inputPath = path.join(dir, 'input.json');
    const csvPath = path.join(dir, 'golden.csv');
    const sidecarPath = path.join(dir, 'golden.sidecar.json');

    for (const fp of [inputPath, csvPath, sidecarPath]) {
      if (!fs.existsSync(fp)) fail(`missing file for case ${c}: ${path.relative(repoRoot, fp)}`);
    }

    const input = readJson(inputPath);
    if (!Array.isArray(input.points) || input.points.length === 0) {
      fail(`case ${c}: input.points must be a non-empty array`);
    }

    const header = parseCsvHeader(fs.readFileSync(csvPath, 'utf8'));
    for (const col of REQUIRED_COLUMNS) {
      if (!header.includes(col)) fail(`case ${c}: golden.csv missing required column '${col}'`);
    }

    const sidecar = readJson(sidecarPath);
    if (sidecar.schemaVersion !== 1) fail(`case ${c}: sidecar schemaVersion must be 1`);
    if (!Array.isArray(sidecar?.export?.requiredColumns)) fail(`case ${c}: sidecar.export.requiredColumns missing`);

    const expectedMinSlices = Number(sidecar?.expectations?.minSlices ?? 0);
    const sidecarSlices = Number(sidecar?.stats?.sliceCount ?? 0);
    if (expectedMinSlices > 0 && sidecarSlices < expectedMinSlices) {
      fail(`case ${c}: sidecar.stats.sliceCount (${sidecarSlices}) < expectations.minSlices (${expectedMinSlices})`);
    }

    const expectedMinWarnings = Number(sidecar?.expectations?.minWarnings ?? 0);
    const sidecarWarnings = Number(sidecar?.stats?.warningCount ?? 0);
    if (expectedMinWarnings > 0 && sidecarWarnings < expectedMinWarnings) {
      fail(`case ${c}: sidecar.stats.warningCount (${sidecarWarnings}) < expectations.minWarnings (${expectedMinWarnings})`);
    }

    const expectedMaxWarnings = Number(sidecar?.expectations?.maxWarnings ?? Number.POSITIVE_INFINITY);
    if (Number.isFinite(expectedMaxWarnings) && sidecarWarnings > expectedMaxWarnings) {
      fail(`case ${c}: sidecar.stats.warningCount (${sidecarWarnings}) > expectations.maxWarnings (${expectedMaxWarnings})`);
    }
  }

  console.log('[surface-acceptance] Dataset pack checks: OK');
}

main();
