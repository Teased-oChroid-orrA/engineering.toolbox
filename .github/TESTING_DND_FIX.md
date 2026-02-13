# Testing the Drag-and-Drop Fix

## What Was Fixed
The `BushingSortableLane` wrapper was completely rewritten from a complex 70+ line implementation with internal state management to a simple 45-line pass-through wrapper. This eliminates the card disappearing issue.

## Before Testing
1. **Clear your browser's localStorage** to remove any corrupted data:
   - Open browser DevTools (F12)
   - Go to Application tab > Local Storage
   - Find `scd.bushing.layout.v3` and delete it
   - Or run in console: `localStorage.clear()`

2. **Restart the dev server** to pick up changes:
   ```bash
   # Kill any existing dev server
   # Then start fresh
   npm run dev
   ```

## Testing Steps

### 1. Verify Cards Render
- Navigate to `http://127.0.0.1:5173/#/bushing`
- **Expected:** All cards should be visible (Header, Guidance, Setup, Geometry, Profile, Process on left; Drafting View, Results Panel, Diagnostics on right)
- **If cards are missing:** Check console for errors, try clearing localStorage again

### 2. Test Basic Drag
- Hover over any card's drag handle (usually the header area)
- Click and hold, then drag vertically
- **Expected:** 
  - Cards should remain visible during drag
  - Other cards should smoothly reorder as you drag
  - No console errors
- **If cards disappear:** Check console, take screenshot, report error messages

### 3. Test Drag Release
- While dragging a card, release the mouse button
- **Expected:**
  - Card should animate to its new position
  - All cards should remain visible
  - New order should persist (check localStorage: `scd.bushing.layout.v3`)
- **If cards disappear on release:** This indicates a finalize event issue

### 4. Test Drag Across Columns (if supported)
- Try dragging a left column card to the right column (or vice versa)
- **Expected:** Should either:
  - Swap positions if cross-column drag is supported
  - Snap back if not supported
  - Never disappear

### 5. Test Page Reload
- After reordering, reload the page
- **Expected:** Card order should be preserved from localStorage

## Expected Console Output

### Good Signs ✅
- No errors
- No warnings about missing items
- No Svelte `each_key_duplicate` errors
- No `undefined is not an object` errors

### Warning Signs ⚠️
- `[BushingCardLayout] Detected duplicates` - Will auto-recover, but indicates corrupted localStorage
- `[BushingLayout] Detected duplicate keys, clearing corrupted data` - Auto-recovery working

### Bad Signs ❌
- `each_key_duplicate` - Indicates duplicate card IDs (should be prevented by our fixes)
- `undefined is not an object (evaluating 'originalDragTarget.parentElement')` - svelte-dnd-action error
- `TypeError: undefined is not an object (evaluating 'el.getBoundingClientRect')` - Layout calculation error

## Debugging

### If Cards Still Disappear
1. Open browser DevTools console BEFORE starting drag
2. Start drag operation
3. Look for the FIRST error message (not subsequent ones)
4. Take screenshot of both the page and console
5. Check localStorage: `console.log(JSON.parse(localStorage.getItem('scd.bushing.layout.v3')))`
6. Check if duplicate IDs exist: Run this in console:
   ```javascript
   const layout = JSON.parse(localStorage.getItem('scd.bushing.layout.v3'));
   const left = layout.leftCardOrder;
   const right = layout.rightCardOrder;
   console.log('Left duplicates:', left.length !== new Set(left).size);
   console.log('Right duplicates:', right.length !== new Set(right).size);
   console.log('Left cards:', left);
   console.log('Right cards:', right);
   ```

### If Drag Doesn't Work At All
1. Check if DnD is enabled: `console.log(localStorage.getItem('scd.bushing.dnd.enabled'))`
2. Should be `null` or `"1"` or `"true"`
3. If it's `"0"` or `"false"`, enable it: `localStorage.setItem('scd.bushing.dnd.enabled', '1')`

### If Only Some Cards Disappear
This might indicate:
- Specific card has rendering issue
- Card ID mismatch
- Check which cards have the issue and report the pattern

## Verification Commands

Run these to ensure the fix is properly integrated:

```bash
# 1. Check all architecture and DnD integrity
npm run check

# 2. Run DnD-specific verification
npm run verify:dnd-integrity

# 3. Run E2E test (requires dev server running)
npm run verify:bushing-dnd

# 4. Run full bushing regression
npm run verify:bushing-regression
```

All should pass with no errors.

## What Success Looks Like

1. ✅ All cards visible at all times (before, during, after drag)
2. ✅ Smooth drag animations
3. ✅ Cards reorder correctly
4. ✅ Order persists after reload
5. ✅ No console errors or warnings
6. ✅ No Svelte export_let_unused warnings
7. ✅ localStorage contains valid, non-duplicate card IDs

## If Still Broken

Please provide:
1. Screenshot of the issue
2. Console output (full log, not just errors)
3. localStorage contents: `localStorage.getItem('scd.bushing.layout.v3')`
4. Browser and version
5. Any specific actions that trigger the issue

## Technical Details of the Fix

The key insight was that `svelte-dnd-action` manages its own internal state and expects to receive the same `items` array reference it emits via events. Our wrapper was creating a shadow copy (`workingItems`) and manipulating it, which broke the library's assumptions about reference equality and state synchronization.

**Old pattern (broken):**
```typescript
let workingItems = items;
// dndzone uses workingItems (different reference)
use:dndzone={{ items: workingItems }}
```

**New pattern (fixed):**
```typescript
// dndzone uses items directly (same reference)
use:dndzone={{ items }}
```

This is a classic case of **don't fight the library** - let it do what it's designed to do!
