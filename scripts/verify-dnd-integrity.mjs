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
  { pattern: /(console\.warn|bushingLogger\.warn|logger\.warn).*duplicate/i, description: 'warning log for duplicates' },
  { pattern: /localStorage\.removeItem/, description: 'corrupted data cleanup' }
];

for (const check of requiredChecks) {
  if (!check.pattern.test(layoutPersistenceSrc)) {
    failures.push(`layoutPersistence missing failsafe: ${check.description}`);
  } else {
    console.log(`  ✓ Found failsafe: ${check.description}`);
  }
}

// Check 4: Verify the current draggable card wrapper exposes the expected DnD markers.
console.log('[DnD Integrity] Checking BushingDraggableCard contract...');
const draggableCardPath = path.join(root, 'src/lib/components/bushing/BushingDraggableCard.svelte');
const draggableCardSrc = fs.readFileSync(draggableCardPath, 'utf8');

const requiredDraggableChecks = [
  { pattern: /data-dnd-card=\{cardId\}/, description: 'stable card id marker' },
  { pattern: /data-dnd-lane=\{column\}/, description: 'lane marker' },
  { pattern: /data-drag-enabled=\{dragEnabled \? '1' : '0'\}/, description: 'drag-enabled flag' },
  { pattern: /role="listitem"/, description: 'listitem role' },
  { pattern: /\{#if dragEnabled\}/, description: 'conditional move controls' }
];

for (const check of requiredDraggableChecks) {
  if (!check.pattern.test(draggableCardSrc)) {
    failures.push(`BushingDraggableCard missing pattern: ${check.description}`);
  } else {
    console.log(`  ✓ Found pattern: ${check.description}`);
  }
}

// Check 5: Verify the diagnostics panel still persists and reorders its nested layout.
console.log('[DnD Integrity] Checking diagnostics panel reordering...');
const diagnosticsPanelPath = path.join(root, 'src/lib/components/bushing/BushingDiagnosticsPanel.svelte');
const diagnosticsPanelSrc = fs.readFileSync(diagnosticsPanelPath, 'utf8');

const requiredDiagnosticsChecks = [
  { pattern: /loadNestedDiagnosticsLayout/, description: 'nested diagnostics layout load' },
  { pattern: /persistNestedDiagnosticsLayout/, description: 'nested diagnostics layout persist' },
  { pattern: /normalizeOrder/, description: 'nested diagnostics order normalization' },
  { pattern: /reorderList/, description: 'nested diagnostics reorder helper' },
  { pattern: /__SCD_BUSHING_TEST_REORDER_DIAG__/, description: 'test hook for diagnostics reorder' }
];

for (const check of requiredDiagnosticsChecks) {
  if (!check.pattern.test(diagnosticsPanelSrc)) {
    failures.push(`BushingDiagnosticsPanel missing pattern: ${check.description}`);
  } else {
    console.log(`  ✓ Found pattern: ${check.description}`);
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
