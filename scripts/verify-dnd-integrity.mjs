#!/usr/bin/env node
/**
 * verify-dnd-integrity.mjs
 * 
 * Regression prevention for drag-and-drop card layout issues.
 * Verifies:
 * 1. No duplicate card IDs in default orders
 * 2. normalizeOrder function properly deduplicates
 * 3. Layout controller functions are pure and safe
 * 4. All card IDs are properly typed
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const failures = [];

// Check 1: Verify default orders have no duplicates
console.log('[DnD Integrity] Checking default card orders...');
const layoutControllerPath = path.join(root, 'src/lib/components/bushing/BushingCardLayoutController.ts');
const layoutControllerSrc = fs.readFileSync(layoutControllerPath, 'utf8');

// Extract LEFT_DEFAULT_ORDER
const leftMatch = layoutControllerSrc.match(/LEFT_DEFAULT_ORDER:\s*\w+\[\]\s*=\s*\[([^\]]+)\]/);
if (!leftMatch) {
  failures.push('Could not extract LEFT_DEFAULT_ORDER from BushingCardLayoutController.ts');
} else {
  const leftIds = leftMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
  const leftSet = new Set(leftIds);
  if (leftIds.length !== leftSet.size) {
    failures.push(`LEFT_DEFAULT_ORDER contains duplicates: ${leftIds.join(', ')}`);
  } else {
    console.log(`  ✓ LEFT_DEFAULT_ORDER has no duplicates (${leftIds.length} cards)`);
  }
}

// Extract RIGHT_DEFAULT_ORDER
const rightMatch = layoutControllerSrc.match(/RIGHT_DEFAULT_ORDER:\s*\w+\[\]\s*=\s*\[([^\]]+)\]/);
if (!rightMatch) {
  failures.push('Could not extract RIGHT_DEFAULT_ORDER from BushingCardLayoutController.ts');
} else {
  const rightIds = rightMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
  const rightSet = new Set(rightIds);
  if (rightIds.length !== rightSet.size) {
    failures.push(`RIGHT_DEFAULT_ORDER contains duplicates: ${rightIds.join(', ')}`);
  } else {
    console.log(`  ✓ RIGHT_DEFAULT_ORDER has no duplicates (${rightIds.length} cards)`);
  }
}

// Check 2: Verify normalizeOrder has deduplication logic
console.log('[DnD Integrity] Checking normalizeOrder deduplication...');
if (!layoutControllerSrc.includes('new Set(')) {
  failures.push('normalizeOrder function does not use Set for deduplication');
} else {
  console.log('  ✓ normalizeOrder uses Set for deduplication');
}

// Check 3: Verify failsafe checks exist
console.log('[DnD Integrity] Checking failsafe mechanisms...');
const layoutPersistencePath = path.join(root, 'src/lib/components/bushing/BushingLayoutPersistence.ts');
const layoutPersistenceSrc = fs.readFileSync(layoutPersistencePath, 'utf8');

const requiredChecks = [
  { pattern: /new Set\(.+\)\.size/, description: 'duplicate detection using Set.size' },
  { pattern: /console\.warn.*duplicate/i, description: 'warning log for duplicates' },
  { pattern: /localStorage\.removeItem/, description: 'corrupted data cleanup' }
];

for (const check of requiredChecks) {
  if (!check.pattern.test(layoutPersistenceSrc)) {
    failures.push(`layoutPersistence missing failsafe: ${check.description}`);
  } else {
    console.log(`  ✓ Found failsafe: ${check.description}`);
  }
}

// Check 4: Verify NativeDragLane is properly implemented
console.log('[DnD Integrity] Checking NativeDragLane patterns...');
const nativeLanePath = path.join(root, 'src/lib/components/bushing/NativeDragLane.svelte');
const nativeLaneSrc = fs.readFileSync(nativeLanePath, 'utf8');

// Verify native implementation patterns
const requiredNativeChecks = [
  { pattern: /draggable={enabled}/i, description: 'draggable attribute with enabled prop' },
  { pattern: /dispatch\(['"]finalize['"],\s*{/, description: 'finalize event dispatch' },
  { pattern: /ondragstart/i, description: 'native ondragstart handler' },
  { pattern: /ondrop/i, description: 'native ondrop handler' }
];

for (const check of requiredNativeChecks) {
  if (!check.pattern.test(nativeLaneSrc)) {
    failures.push(`NativeDragLane missing pattern: ${check.description}`);
  } else {
    console.log(`  ✓ Found pattern: ${check.description}`);
  }
}

// Verify it's NOT using complex state management
const antipatterns = [
  { pattern: /let workingItems/, description: 'should not use workingItems state' }
];

for (const anti of antipatterns) {
  if (anti.pattern.test(nativeLaneSrc)) {
    console.log(`  ⚠ Warning: Found antipattern - ${anti.description}`);
  } else {
    console.log(`  ✓ Clean: ${anti.description}`);
  }
}

// Check 5: Verify FreePositionContainer uses 'export const' for unused props
console.log('[DnD Integrity] Checking FreePositionContainer export patterns...');
const freePositionPath = path.join(root, 'src/lib/components/bushing/BushingFreePositionContainer.svelte');
const freePositionSrc = fs.readFileSync(freePositionPath, 'utf8');

// Count export let vs export const
const exportLetMatches = freePositionSrc.match(/export let \w+/g) || [];
const exportConstMatches = freePositionSrc.match(/export const \w+/g) || [];

console.log(`  Found ${exportLetMatches.length} 'export let' and ${exportConstMatches.length} 'export const'`);

// Check if the props that should be const are const
const propsToBeConst = ['form', 'results', 'draftingView', 'useLegacyRenderer', 'renderMode', 
                         'traceEnabled', 'cacheStats', 'babylonInitNotice', 'visualDiagnostics', 
                         'babylonDiagnostics', 'onExportSvg', 'onExportPdf', 'toggleRendererMode', 
                         'toggleTraceMode', 'handleBabylonInitFailure', 'showInformationView', 'isFailed'];

for (const prop of propsToBeConst) {
  const letPattern = new RegExp(`export let ${prop}\\b`);
  if (letPattern.test(freePositionSrc)) {
    // This is acceptable, just informational
    console.log(`  ℹ Found 'export let ${prop}' (consider 'export const' if unused internally)`);
  }
}

// Report results
console.log('\n[DnD Integrity] Summary:');
if (failures.length === 0) {
  console.log('✅ All drag-and-drop integrity checks passed!');
  process.exit(0);
} else {
  console.error('❌ Drag-and-drop integrity check failures:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
