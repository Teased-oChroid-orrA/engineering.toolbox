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
  path.resolve(repoRoot, 'src/lib/components/surface/SurfaceOrchestrator.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/CurveEdgesLoftPanel.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/SurfaceFitPanel.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/SurfaceDatumSliceExportPanel.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/SurfaceSlicingRecommendationRail.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/SurfaceWorkflowGuideCard.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/SurfaceStatusRail.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/SurfaceRecipesPanel.svelte'),
  path.resolve(repoRoot, 'src/lib/components/surface/controllers/SurfaceSlicingExportController.ts'),
  path.resolve(repoRoot, 'src/lib/components/surface/controllers/SurfaceSlicingInsightsController.ts'),
  path.resolve(repoRoot, 'src/lib/components/surface/controllers/SurfaceWarningsController.ts'),
  path.resolve(repoRoot, 'src/lib/components/surface/controllers/SurfaceWarningDispatchController.ts'),
  path.resolve(repoRoot, 'src/lib/components/surface/controllers/SurfaceRecipesController.ts'),
  path.resolve(repoRoot, 'src/lib/components/surface/controllers/SurfaceRecipeRunController.ts'),
  path.resolve(repoRoot, 'src/lib/components/surface/controllers/SurfaceRecipeTransactionController.ts'),
  path.resolve(repoRoot, 'src/lib/components/surface/controllers/SurfaceThemeController.ts'),
  path.resolve(repoRoot, 'src/lib/surface/regression/DatumSlicingKernel.ts'),
  path.resolve(repoRoot, 'src/lib/surface/eval/SurfaceEvaluation.ts'),
  path.resolve(repoRoot, 'src/lib/surface/api/surfaceApi.ts'),
  path.resolve(repoRoot, 'src/lib/surface/SurfaceArchitectureManifest.ts'),
  path.resolve(repoRoot, 'scripts/verify-surface-regression.mjs'),
  path.resolve(repoRoot, 'scripts/verify-surface-release-readiness.mjs'),
  path.resolve(repoRoot, 'scripts/verify-surface-toolbox.mjs'),
  path.resolve(repoRoot, 'package.json'),
  path.resolve(repoRoot, 'playwright.config.ts'),
  path.resolve(repoRoot, 'tests/surface-smoke.spec.ts'),
  path.resolve(repoRoot, 'implementation/surface-toolbox-plan-v3/release-readiness.md'),
  path.resolve(repoRoot, 'implementation/surface-toolbox-plan-v3/deferred-obj-stl-backlog.md')
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
  { id: 'slice_eval_cmd', label: 'section slicing invoke present', anyInclude: ['surface_eval_section_slices', 'surfaceEvalSectionSlices'] },
  { id: 'datum_slice_panel', label: 'datum slicing panel exists', mustInclude: ['Datum Slicing + Export'] },
  { id: 'datum_slice_mode_fixed_spacing', label: 'datum slicing defaults include fixed spacing', mustInclude: ['fixed_spacing'] },
  { id: 'combined_export_csv_json', label: 'combined CSV + JSON sidecar export is wired', mustInclude: ['CSV + JSON'] },
  { id: 'slice_optional_columns_toggle', label: 'optional slice columns toggle exists', mustInclude: ['optional columns'] },
  { id: 'warning_dual_channel', label: 'warning dual-channel includes status rail and toast', mustInclude: ['Status Rail', 'toast'] },
  { id: 'workspace_recipes', label: 'workspace recipe panel exists', mustInclude: ['Workspace Recipes'] },
  { id: 'recipe_step_confirmed', label: 'step-confirmed recipe runs are supported', mustInclude: ['Step-confirmed run'] },
  { id: 'recipe_store_v2', label: 'recipe store v2 migration exists', mustInclude: ['sc.surface.recipes.v2', 'migrated'] },
  { id: 'recipe_transaction', label: 'recipe transaction rollback/finalize exists', mustInclude: ['beginRecipeTransaction', 'finalizeRecipeTransaction', 'rollbackRecipeTransaction'] },
  { id: 'theme_tokens_tech_lab', label: 'technical-lab tokens are present', mustInclude: ['surface-lab', 'surface-tech-card', '--surface-lab-accent'] },
  { id: 'dual_typography', label: 'dual typography tokens are present', mustInclude: ['--surface-font-display', '--surface-font-data'] },
  { id: 'motion_spec', label: 'motion spec is wired through controller and css', mustInclude: ['SURFACE_MOTION_SPEC', 'surface-reveal'] },
  { id: 'warning_stack_filters', label: 'status rail supports severity filtering', mustInclude: ['Err', 'Warn', 'Info', 'Critical:'] },
  { id: 'slicing_recommendation_rail', label: 'slicing recommendation rail exists', mustInclude: ['Recommendation Rail', 'buildSliceSyncModel'] },
  { id: 'guided_microcopy', label: 'guided microcopy blocks are present', mustInclude: ['Recommended workflow:', 'Load a CSV/STEP file to begin.'] },
  { id: 'acceptance_pack_verify', label: 'acceptance dataset pack verifier is wired', mustInclude: ['verify-surface-acceptance-pack', 'surface-acceptance'] },
  { id: 'regression_1e4', label: 'geometry regression verifier uses 1e-4 tolerance', mustInclude: ['verify-surface-regression', '1e-4'] },
  { id: 'smoke_e2e', label: 'surface smoke e2e spec exists', mustInclude: ['surface-smoke.spec', 'Core Mode is active.'] },
  { id: 'release_readiness', label: 'release readiness verifier and docs exist', mustInclude: ['verify-surface-release-readiness', 'deferred-obj-stl-backlog', 'Release Readiness'] },

  // Surface architecture manifest baseline (STB-001/002/003)
  { id: 'arch_manifest_modules', label: 'SURFACE_MODULES registry exists', mustInclude: ['SURFACE_MODULES'] },
  { id: 'arch_manifest_policy', label: 'SURFACE_LAYER_IMPORT_POLICY exists', mustInclude: ['SURFACE_LAYER_IMPORT_POLICY'] },
  { id: 'arch_manifest_validator', label: 'validateSurfaceArchitectureManifest exists', mustInclude: ['validateSurfaceArchitectureManifest'] },
  { id: 'arch_toolbox_wiring', label: 'SURFACE_TOOLBOX_WIRING exists', mustInclude: ['SURFACE_TOOLBOX_WIRING'] },
  { id: 'arch_core_mode_default', label: 'Core Mode default is wired', mustInclude: ['coreModeDefaultOn'] },
  { id: 'arch_adv_launch_collapsed', label: 'Advanced panels collapse on fresh launch', mustInclude: ['advancedPanelDefaultCollapsedOnFreshLaunch'] },
  { id: 'arch_adv_session_memory', label: 'Advanced panel session memory is wired', mustInclude: ['advancedPanelRememberWithinSession'] },
  { id: 'arch_export_defaults', label: 'CSV+JSON export defaults are wired', mustInclude: ['csv-combined', 'json-metadata'] }
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
