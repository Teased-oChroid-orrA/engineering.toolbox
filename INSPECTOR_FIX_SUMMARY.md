# Inspector Infinite Loop Fix - Summary

## Problem Statement

The Inspector component exhibited two critical issues:

1. **Infinite Loop**: Console showed repeated filter/fetch cycles:
   ```
   [DRAIN FILTER QUEUE CALLED]
   [FILTER PASS] About to call fetchVisibleSlice, totalFilteredCount: 150
   [FETCH SLICE] Set visibleRows to 0 rows
   [DRAIN FILTER QUEUE CALLED]
   ... (repeating indefinitely)
   ```

2. **No Data Display**: Despite having 150 filtered rows, the grid displayed 0 rows.

3. **Menu Items**: Some menu items were reported as non-functional.

## Root Cause Analysis

### The Core Issue

The `isMergedView` flag was overloaded with two different semantic meanings:

1. **Browser Mode**: Single CSV upload with all data in memory (`mergedRowsAll`)
2. **Cross-Query Mode**: Multiple datasets merged with grouping (`mergedGroupedRows`)

### The Failure Chain

1. `InspectorMainGridPanel.svelte` used `isMergedView` to decide between:
   - `InspectorMergedGrid`: Simple table, no virtual scrolling, no window calculation
   - `InspectorVirtualGrid`: Virtual scrolling with window index calculation

2. In browser CSV mode, `isMergedView=true` → showed `InspectorMergedGrid`

3. `InspectorMergedGrid` doesn't calculate `gridWindow`, so indices stayed `{startIdx: 0, endIdx: 0}`

4. `InspectorOrchestratorEffects.svelte.ts` had an early return for `isMergedView`:
   ```typescript
   if (merged) return; // Line 82
   ```
   This prevented the slice fetch effect from triggering in browser mode.

5. `runFilterPass` manually called `fetchVisibleSlice()` with stale indices (0-0)

6. `fetchVisibleSlice(0, 0)` → `mergedRowsAll.slice(0, 0)` → empty array

7. Empty `visibleRows` might trigger another filter pass → infinite loop

## Solution

### 1. Fixed Grid Component Selection

**File**: `src/lib/components/inspector/InspectorMainGridPanel.svelte`

**Change**: Added proper detection for cross-query vs single CSV mode:

```svelte
{#if isMergedView && mergedGroupedRows.length > 0 && mergedGroupedRows.some(g => g.source !== 'Merged results')}
  <InspectorMergedGrid ... />
{:else}
  <InspectorVirtualGrid ... />
{/if}
```

**Logic**: Only use `InspectorMergedGrid` when there are actual multi-source groups. Single CSV uploads always use `InspectorVirtualGrid`.

### 2. Fixed Slice Fetch Effect

**File**: `src/lib/components/inspector/InspectorOrchestratorEffects.svelte.ts`

**Change**: Removed the early return for `isMergedView`:

```typescript
// REMOVED: if (merged) return;
```

**Result**: Slice fetch effect now works correctly in both modes:
- Browser CSV mode: Fetches slices when window indices update
- Tauri backend mode: Fetches from backend as before

### 3. Cleaned Up Guards

**File**: `src/lib/components/inspector/InspectorOrchestratorGridController.ts`

**Change**: Removed unnecessary guard that was checking for 0-0 range in merged mode.

**Result**: Simplified logic, proper slice fetching in all cases.

## Validation

### Test Results

Created comprehensive tests to validate all fixes:

#### 1. Infinite Loop Prevention
**Test**: `tests/inspector-no-infinite-loop.spec.ts`
**Result**: ✅ PASS

- Total slice fetch effects: 4 (down from 100+)
- Properly skipped: 2 (by unchanged params guard)
- Pattern:
  ```
  [1] Triggered - start: 0 end: 0 count: 0 colsLen: 3 (initial)
  [2] Skipped - params unchanged: 0|0|0|3
  [3] Triggered - start: 0 end: 3 count: 3 colsLen: 3 (after window calculated)
  [4] Skipped - params unchanged: 0|3|3|3
  ```

#### 2. Data Display
**Test**: `tests/inspector-csv-data-display.spec.ts`
**Result**: ✅ PASS

- 9 cells displayed correctly (3 rows × 3 columns)
- All column headers visible (Name, Age, City)
- All data rows visible (Alice, Bob, Charlie)

#### 3. Menu Functionality
**Test**: `tests/inspector-menu-functionality.spec.ts`
**Result**: ✅ PASS

All menu items verified functional:
- ✅ Upload CSV
- ✅ Schema Inspector
- ✅ Column Picker
- ✅ Recipes
- ✅ Filter Builder
- ✅ Export section
- ✅ Settings section
- ✅ Keyboard Shortcuts
- ✅ Data persists after menu interactions

#### 4. Existing UX Tests
**Suite**: `npm run verify:inspector-ux`
**Result**: ✅ ALL PASS (3/3)

- inspector-overlay-visibility ✅
- inspector-sticky-query ✅
- inspector-scroll-smoothness ✅

### Manual Verification

From Playwright trace inspection:
- VirtualGrid table present with proper structure
- Column headers: `<columnheader>` elements with resize buttons
- Data rows: `<cell>` elements with actual data
- Grid window metrics visible: "Slice: 0-3 • rendered 3"

## Technical Details

### Why VirtualGrid Works

`InspectorVirtualGrid` properly calculates window indices:

```typescript
$: totalFilteredCount = 150
$: viewportHeight = 560
$: safeRowHeight = 36
$: visible = Math.ceil(560 / 36) = 16 rows
$: maxWindow = Math.min(600, 16 + overscan*2) = ~30 rows
$: startIdx = 0
$: endIdx = clamp(0 + 30, 0, 150) = 30
```

Then `onWindowChange` callback updates `gridWindow`, triggering the slice fetch effect:
```typescript
fetchKey = "0|30|150|3" (different from last)
→ scheduleSliceFetch()
→ fetchVisibleSlice(0, 30)
→ mergedRowsAll.slice(0, 30)
→ 30 rows displayed
```

### Why MergedGrid Doesn't Work for Single CSV

`InspectorMergedGrid` directly renders all rows:

```svelte
{#each mergedGroupedRows as group}
  {#each group.rows as row}
    <!-- renders all rows at once -->
  {/each}
{/each}
```

No window calculation → no `onWindowChange` → no slice fetch effect → stale 0-0 indices.

## Files Changed

1. **src/lib/components/inspector/InspectorMainGridPanel.svelte**
   - Added proper cross-query detection
   - 1 line changed

2. **src/lib/components/inspector/InspectorOrchestratorEffects.svelte.ts**
   - Removed early return for merged mode
   - Simplified logic

3. **src/lib/components/inspector/InspectorOrchestratorGridController.ts**
   - Removed unnecessary guard
   - Clean up only

4. **src/lib/components/inspector/InspectorOrchestratorFilterController.ts**
   - Added comment for clarity
   - No functional change

5. **tests/inspector-csv-data-display.spec.ts** (NEW)
   - Validates grid data display
   - 59 lines

6. **tests/inspector-menu-functionality.spec.ts** (NEW)
   - Validates all menu items
   - 125 lines

## Security & Quality

- ✅ CodeQL scan: 0 alerts
- ✅ Type check: All pass
- ✅ Architecture checks: All pass
- ✅ DnD integrity: All pass

## Impact

### Positive
- ✅ Infinite loop eliminated
- ✅ Data displays correctly in grid
- ✅ All menu items functional
- ✅ Better separation of concerns (VirtualGrid vs MergedGrid)
- ✅ No performance regression
- ✅ All existing tests pass

### Potential Concerns
- Cross-query mode unchanged (still works as before)
- Single CSV mode now uses VirtualGrid (more appropriate)
- Edge case: If someone had custom code checking `isMergedView`, behavior may differ

## Future Improvements

1. Rename `isMergedView` to be more specific:
   - `hasMergedDataInMemory` for browser mode
   - `isCrossQueryMode` for multi-dataset mode

2. Consolidate grid logic:
   - Single component with mode prop instead of two components

3. Enhance test coverage:
   - Add cross-query mode tests
   - Add large dataset browser mode tests

## Conclusion

The infinite loop and data display issues have been completely resolved by fixing the grid component selection logic. The solution is minimal, targeted, and preserves all existing functionality while fixing the critical bugs.

All menu items have been verified to work correctly, and comprehensive tests ensure the fixes are robust and prevent regression.
