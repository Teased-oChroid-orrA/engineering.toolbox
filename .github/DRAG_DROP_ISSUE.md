# CRITICAL ISSUE: svelte-dnd-action + Svelte 5 Incompatibility

## Problem
`svelte-dnd-action` v0.9.69 is **NOT compatible** with Svelte 5.  
Error: `TypeError: can't access property "parentElement", originalDragTarget is undefined`

## Root Cause
The library accesses DOM elements in a way that breaks with Svelte 5's new reactivity model.

## Immediate Solution
**Drag-and-drop has been disabled by default.** Use Up/Down buttons to reorder cards.

## How to Enable/Disable
In browser console:
```javascript
// Disable drag-and-drop (USE THIS - it's broken)
localStorage.setItem('scd.bushing.dnd.enabled', '0');
location.reload();

// Enable drag-and-drop (WILL CAUSE ERRORS)
localStorage.setItem('scd.bushing.dnd.enabled', '1');
location.reload();
```

## Long-term Solutions

### Option 1: Wait for Library Update
- Monitor: https://github.com/isaacHagoel/svelte-dnd-action/issues
- Check for Svelte 5 compatible release

### Option 2: Use Native HTML5 Drag-and-Drop
- Implemented in `NativeDragLane.svelte` (ready to use)
- No external dependencies
- Full Svelte 5 compatibility
- To use: Set `useNativeDnd = true` in BushingOrchestrator.svelte

### Option 3: Use Alternative Library
- `@dnd-kit/core` - React-based, needs Svelte wrapper
- `pragmatic-drag-and-drop` - Atlassian's library
- Build custom solution

## Testing Status
- ❌ `svelte-dnd-action` - **FAILS** with `originalDragTarget undefined`
- ✅ Up/Down buttons - **WORKS**  
- 🔄 `NativeDragLane` - **READY** but needs integration
- ✅ Free positioning mode - **WORKS** (different feature)

## Files Affected
- `src/lib/components/bushing/BushingSortableLane.svelte` - Wrapper (simplified but library still breaks)
- `src/lib/components/bushing/BushingOrchestrator.svelte` - DnD disabled by default
- `src/lib/components/bushing/NativeDragLane.svelte` - Native implementation (alternative)

## Recommendation
**Use Up/Down buttons until library is updated or we integrate NativeDragLane.**

Drag-and-drop is a nice-to-have feature. The core functionality (card reordering via buttons) works perfectly.
