#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import ts from 'typescript';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const packRoot = path.join(repoRoot, 'implementation', 'surface-toolbox-plan-v3', 'acceptance', 'datasets');
const kernelPath = path.join(repoRoot, 'src', 'lib', 'surface', 'regression', 'DatumSlicingKernel.ts');
const TOL = 1e-4;

function fail(msg) {
  console.error(`[surface-regression] ${msg}`);
  process.exit(1);
}

function loadKernel(tsFilePath) {
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
    require: undefined
  };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(transpiled, sandbox, { filename: tsFilePath });
  return sandbox.module.exports;
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((x) => x.trim());
  const rows = lines.slice(1).map((line) => line.split(',').map((x) => x.trim()));
  return { headers, rows };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function nearly(a, b, tol = TOL) {
  return Math.abs(a - b) <= tol;
}

function compareCase(name, computeFn) {
  const dir = path.join(packRoot, name);
  const input = JSON.parse(fs.readFileSync(path.join(dir, 'input.json'), 'utf8'));
  const goldenCsv = fs.readFileSync(path.join(dir, 'golden.csv'), 'utf8');
  const sidecar = JSON.parse(fs.readFileSync(path.join(dir, 'golden.sidecar.json'), 'utf8'));

  const res = computeFn({
    points: input.points,
    plane: input.plane,
    mode: input.mode,
    spacing: input.spacing,
    count: input.count,
    thickness: input.thickness,
    generatedAt: '2026-02-10T00:00:00.000Z'
  });

  if (!nearly(res.spacingUsed, Number(input.spacing), TOL) && input.mode === 'fixed_spacing') {
    fail(`${name}: spacingUsed mismatch. expected ${input.spacing} got ${res.spacingUsed}`);
  }
  if (res.pointsInputCount !== input.points.length) {
    fail(`${name}: pointsInputCount mismatch. expected ${input.points.length} got ${res.pointsInputCount}`);
  }

  const expectedPoints = Number(sidecar?.stats?.pointsExportedCount ?? -1);
  if (expectedPoints >= 0 && res.pointsExportedCount !== expectedPoints) {
    fail(`${name}: pointsExportedCount mismatch. expected ${expectedPoints} got ${res.pointsExportedCount}`);
  }

  const expectedSlices = Number(sidecar?.stats?.sliceCount ?? -1);
  if (expectedSlices >= 0 && res.stations.length !== expectedSlices) {
    fail(`${name}: sliceCount mismatch. expected ${expectedSlices} got ${res.stations.length}`);
  }

  const expectedWarnings = Number(sidecar?.stats?.warningCount ?? -1);
  if (expectedWarnings >= 0 && res.warnings.length !== expectedWarnings) {
    fail(`${name}: warningCount mismatch. expected ${expectedWarnings} got ${res.warnings.length}`);
  }

  const parsed = parseCsv(goldenCsv);
  const idx = {
    slice: parsed.headers.indexOf('slice_id'),
    x: parsed.headers.indexOf('x'),
    y: parsed.headers.indexOf('y'),
    z: parsed.headers.indexOf('z'),
    source: parsed.headers.indexOf('source_entity'),
    residual: parsed.headers.indexOf('residual'),
    method: parsed.headers.indexOf('method'),
    warning: parsed.headers.indexOf('warning_code')
  };

  if (parsed.rows.length !== res.records.length) {
    fail(`${name}: golden row count mismatch. expected ${parsed.rows.length} got ${res.records.length}`);
  }

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const got = res.records[i];
    if (Number(row[idx.slice]) !== got.slice_id) fail(`${name}: row ${i} slice_id mismatch`);
    if (!nearly(num(row[idx.x]), got.x)) fail(`${name}: row ${i} x mismatch`);
    if (!nearly(num(row[idx.y]), got.y)) fail(`${name}: row ${i} y mismatch`);
    if (!nearly(num(row[idx.z]), got.z)) fail(`${name}: row ${i} z mismatch`);

    if (idx.source >= 0 && (row[idx.source] || '') !== (got.source_entity || '')) fail(`${name}: row ${i} source_entity mismatch`);
    if (idx.method >= 0 && (row[idx.method] || '') !== (got.method || '')) fail(`${name}: row ${i} method mismatch`);
    if (idx.warning >= 0 && (row[idx.warning] || '') !== (got.warning_code || '')) fail(`${name}: row ${i} warning_code mismatch`);

    if (idx.residual >= 0) {
      const expectedResidual = num(row[idx.residual] || '0');
      const gotResidual = Number(got.residual ?? 0);
      if (!nearly(expectedResidual, gotResidual)) fail(`${name}: row ${i} residual mismatch`);
    }
  }
}

function main() {
  if (!fs.existsSync(kernelPath)) fail(`kernel missing: ${path.relative(repoRoot, kernelPath)}`);
  const kernel = loadKernel(kernelPath);
  const computeFn = kernel.computeDatumPlaneSlicesKernel;
  if (typeof computeFn !== 'function') fail('computeDatumPlaneSlicesKernel export missing');

  compareCase('plane_dense', computeFn);
  compareCase('sparse_band', computeFn);

  console.log(`[surface-regression] Geometry regression checks passed at tolerance ${TOL}.`);
}

main();
