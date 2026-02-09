#!/usr/bin/env node
/**
 * SurfaceToolbox feature contract (static).
 *
 * Goal: fail fast when critical features get removed/reverted.
 *
 * This is intentionally a pure-text contract (no dependencies) so it can run
 * anywhere (CI, local) without Playwright/Vitest/etc.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const targets = [
  path.resolve(repoRoot, 'src/lib/components/SurfaceToolbox.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/CurveEdgesLoftPanel.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/SurfaceFitPanel.svelte'),
  path.resolve(repoRoot, 'src/lib/surface/eval/SurfaceEvaluation.ts'),
  path.resolve(repoRoot, 'src/lib/surface/api/surfaceApi.ts')
];

function readText(fp) {
  return fs.readFileSync(fp, 'utf8');
}

/**
 * Contract items:
 * - required: build must fail if missing
 * - optional: reported but does not fail (useful while mid-migration)
 */
const REQUIRED = [
  // Curve + Curve Mode
  { id: 'ui_curve_button', label: 'UI has + Curve button', mustInclude: ['+ Curve'] },
  { id: 'ui_curve_mode', label: 'UI has Curve Mode toggle', mustInclude: ['Curve Mode'] },
  { id: 'fn_create_curve', label: 'createCurve() exists', anyInclude: ['function createCurve', 'const createCurve', 'let createCurve'] },
  { id: 'state_curves', label: 'curves state exists', mustInclude: ['curves'] },
  { id: 'state_active_curve', label: 'activeCurveIdx exists', mustInclude: ['activeCurveIdx'] },

  // Loft wiring
  { id: 'loft_selectors', label: 'loftA/loftB exist', mustInclude: ['loftA', 'loftB'] },
  { id: 'fn_rebuild_loft', label: 'rebuildLoftSegments() exists', anyInclude: ['function rebuildLoftSegments', 'const rebuildLoftSegments', 'let rebuildLoftSegments'] },

  // Undo/redo safety (DataCloneError regression prevention)
  { id: 'undo_push', label: 'pushUndo exists', anyInclude: ['function pushUndo', 'const pushUndo', 'let pushUndo'] },
  { id: 'undo_undo', label: 'undo exists', anyInclude: ['function undo', 'const undo', 'let undo'] },
  { id: 'undo_redo', label: 'redo exists', anyInclude: ['function redo', 'const redo', 'let redo'] },
  { id: 'no_structured_clone', label: 'structuredClone is not used (proxy-safe)', mustExclude: ['structuredClone('] },

  // Debug instrumentation (dev-only global error logger)
  { id: 'logger_unhandledrejection', label: 'unhandledrejection logger exists', mustInclude: ['unhandledrejection'] },
  { id: 'logger_last_action', label: 'last UI action tagging exists', anyInclude: ['setLastAction', 'lastAction'] },

  // Surface evaluation baseline you already had working
  { id: 'plane_eval_cmd', label: 'best-fit plane invoke present', anyInclude: ['surface_eval_best_fit_plane', 'surfaceEvalBestFitPlane'] },
  { id: 'slice_eval_cmd', label: 'section slicing invoke present', anyInclude: ['surface_eval_section_slices', 'surfaceEvalSectionSlices'] }
];

const OPTIONAL = [
  { id: 'cylinder_eval_cmd', label: 'best-fit cylinder invoke present', anyInclude: ['surface_eval_best_fit_cylinder', 'surfaceEvalBestFitCylinder'] },
  { id: 'step_import', label: 'STEP import present', anyInclude: ['.stp', '.step', 'surface_import_step', 'surfaceImportStep'] },
  { id: 'export_obj', label: 'OBJ export present', anyInclude: ['.obj', 'exportOBJ', 'exportObj'] },
  { id: 'export_stl', label: 'STL export present', anyInclude: ['.stl', 'exportSTL', 'exportStl'] },
  { id: 'resample', label: 'curve resampling present', anyInclude: ['resample', 'arcLength', 'arclength'] }
];

function hasAll(hay, needles) {
  return needles.every((n) => hay.includes(n));
}

function hasAny(hay, needles) {
  return needles.some((n) => hay.includes(n));
}

function lintItems(src, items, mode) {
  const results = [];
  for (const it of items) {
    const okInclude = it.mustInclude ? hasAll(src, it.mustInclude) : true;
    const okAny = it.anyInclude ? hasAny(src, it.anyInclude) : true;
    const okExclude = it.mustExclude ? !hasAny(src, it.mustExclude) : true;
    const ok = okInclude && okAny && okExclude;
    results.push({ ...it, ok, mode });
  }
  return results;
}

function main() {
  const missing = targets.filter((fp) => !fs.existsSync(fp));
  if (missing.length > 0) {
    console.error('[SurfaceToolbox contract] target(s) not found:');
    for (const fp of missing) console.error(` - ${fp}`);
    process.exit(2);
  }

  const src = targets.map((fp) => readText(fp)).join('\n');
  const req = lintItems(src, REQUIRED, 'required');
  const opt = lintItems(src, OPTIONAL, 'optional');

  const failedReq = req.filter((r) => !r.ok);
  const failedOpt = opt.filter((r) => !r.ok);

  if (failedReq.length) {
    console.error('\n[SurfaceToolbox contract] FAILED required checks:');
    for (const f of failedReq) console.error(` - ${f.id}: ${f.label}`);
  } else {
    console.log('[SurfaceToolbox contract] Required checks: OK');
  }

  // Always report optional items (useful progress tracker)
  if (failedOpt.length) {
    console.log('\n[SurfaceToolbox contract] Optional items currently NOT detected (informational):');
    for (const f of failedOpt) console.log(` - ${f.id}: ${f.label}`);
  } else {
    console.log('\n[SurfaceToolbox contract] Optional items: all detected');
  }

  process.exit(failedReq.length ? 1 : 0);
}

main();
