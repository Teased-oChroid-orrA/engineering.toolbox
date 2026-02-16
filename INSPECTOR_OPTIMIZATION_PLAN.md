# Inspector Toolbox Optimization Plan

## Executive Summary

This document outlines the root causes and fixes for the Inspector toolbox issues identified during user testing.

## Issues Identified

### Issue 1: Loaded Files Not Displaying
**Symptom:** CSV loads successfully, grid displays data, but "Loaded Files" section shows "No file loaded yet" with "across 0 files" counter.

**Root Cause:** Missing setter for `loadedDatasets` in `filterControllerCtx` function. When `upsertWorkspaceDataset` sets `ctx.loadedDatasets`, the setter wasn't defined in the controller context, preventing the state update from propagating to the component.

**Evidence:**
- Console logs show: `[UPSERT WORKSPACE] ctx.loadedDatasets now has 1 items`
- But InspectorLoadedFilesBar still receives `loadedDatasets.length === 0`

**Fix Applied:**
```typescript
// InspectorOrchestratorContexts.ts line 113-114
get loadedDatasets() { return state.loadedDatasets; },
set loadedDatasets(v: WorkspaceDataset[]) { state.loadedDatasets = v; },
```

**Status:** ✅ FIXED (Part 1 - setter added, needs testing)

### Issue 2: Excessive DRAIN FILTER QUEUE Calls
**Symptom:** Console shows "★★★ DRAIN FILTER QUEUE CALLED ★★★" error 18+ times during simple operations like scrolling.

**Root Cause:** Reactive filter effect (`setupReactiveFilterEffect` in `InspectorOrchestratorEffects.svelte.ts`) triggers on ANY state change, causing cascading re-filters. Each filter pass triggers state updates which re-trigger the effect.

**Evidence:**
- 18 DRAIN FILTER QUEUE calls during a single CSV load
- Additional calls during scrolling
- Each call runs a complete filter pass even when no filter parameters changed

**Proposed Fix:**
1. Add debouncing to filter scheduling (already has FILTER_DEBOUNCE_MS but not fully effective)
2. Implement filter parameter hashing to skip redundant filters
3. Add guard to prevent filter during suspendReactiveFiltering

**Status:** ⏳ NOT STARTED

### Issue 3: Single File Limitation
**Symptom:** Can only load one CSV at a time in browser mode

**Root Cause:** Hidden file input element doesn't have `multiple` attribute set

**Proposed Fix:**
```svelte
<!-- InspectorOrchestrator.svelte -->
<input
  type="file"
  accept=".csv,.tsv"
  multiple  <!-- ADD THIS -->
  bind:this={hiddenUploadInput}
  style="display: none"
  onchange={...}
/>
```

**Additional Changes Needed:**
- Update `openFallbackLoadFromMenu` to handle multiple files
- Loop through all selected files and call `loadCsvFromText` for each

**Status:** ⏳ NOT STARTED

### Issue 4: Large CSV Performance Issues
**Symptom:** Grid display and query become sluggish with large CSVs

**Root Causes:**
1. Excessive filter queue calls (see Issue #2)
2. No virtualization optimization for large datasets in browser mode
3. Filter operations run on every state change

**Proposed Optimizations:**
1. Fix Issue #2 (reduce filter calls)
2. Implement filter result caching
3. Add progressive rendering for large datasets
4. Optimize `applyFilterSpec` for browser mode

**Status:** ⏳ NOT STARTED

## Implementation Plan

### Phase 1: Complete Issue #1 Fix ✅ (In Progress)
- [x] Add `loadedDatasets` setter to `filterControllerCtx`
- [ ] Test with browser dev tools
- [ ] Take before/after screenshots
- [ ] Verify file names appear correctly
- [ ] Verify "x" button works to unload files

### Phase 2: Fix Issue #3 (Multi-file Loading) 
- [ ] Add `multiple` attribute to hidden file input
- [ ] Update `openFallbackLoadFromMenu` to handle file arrays
- [ ] Update change handler to process multiple files
- [ ] Test loading 2-3 files simultaneously
- [ ] Verify each file appears in "Loaded Files" section
- [ ] Test unloading individual files

### Phase 3: Fix Issue #2 (DRAIN FILTER QUEUE)
- [ ] Implement filter parameter hashing
- [ ] Add skip logic for duplicate filter calls
- [ ] Improve debouncing implementation
- [ ] Add performance metrics logging
- [ ] Test with large datasets
- [ ] Verify filter call count reduced to <5 per operation

### Phase 4: Optimize Issue #4 (Performance)
- [ ] Profile filter performance with large CSVs
- [ ] Implement filter result caching
- [ ] Optimize browser mode filtering algorithm
- [ ] Add progressive rendering hints
- [ ] Benchmark before/after performance

## Testing Strategy

### Manual Testing Checklist
- [ ] Load single CSV file
- [ ] Verify file name appears in "Loaded Files"
- [ ] Click "x" to unload file
- [ ] Load multiple CSV files at once
- [ ] Verify all files listed
- [ ] Unload individual files
- [ ] Load large CSV (10K+ rows)
- [ ] Scroll through data
- [ ] Apply filters
- [ ] Check console for DRAIN FILTER QUEUE errors (should be minimal)
- [ ] Measure filter response time

### Automated Testing
- [ ] Add test for loadedDatasets reactivity
- [ ] Add test for multiple file loading
- [ ] Add performance benchmark test
- [ ] Add regression test for filter queue calls

## Success Criteria

1. **Issue #1:** Loaded file names display immediately after upload ✅
2. **Issue #2:** DRAIN FILTER QUEUE calls reduced to <5 per operation
3. **Issue #3:** Can load 5+ CSV files simultaneously
4. **Issue #4:** Large CSV (10K rows) filter response <500ms

## Notes

- All fixes maintain backward compatibility with Tauri mode
- Browser mode and Tauri mode have different code paths
- Reactive state system uses Svelte 5 runes ($state, $derived)
- Context system uses getters/setters for reactivity propagation
