# Gate 1 (NATIVE-001): Dependency Audit

**Status:** ✅ COMPLETE  
**Date:** 2026-02-13

## Objective
Document all usages of `svelte-dnd-action` in codebase

## Findings

### Direct Imports
1. **`src/lib/components/bushing/BushingSortableLane.svelte`**
   - Line 20: `import { dndzone, type DndEvent } from 'svelte-dnd-action';`
   - Usage: Wrapper component for drag-and-drop
   - Status: **TO BE REPLACED**

### Usage Points

#### Component Usage
1. **`src/lib/components/bushing/BushingOrchestrator.svelte`**
   - Line 14: `import BushingSortableLane from './BushingSortableLane.svelte';`
   - Line 425-431: Left lane (6 cards: header, guidance, setup, geometry, profile, process)
   - Line 565-571: Right lane (3 cards: drafting, summary, diagnostics)
   - Current state: `dndEnabled = false` (disabled due to Svelte 5 incompatibility)
   - Status: **NEEDS UPDATE** to use NativeDragLane

2. **`src/lib/components/bushing/BushingDraggableCard.svelte`**
   - Lines 33-50: Drag handle UI with "Drag" badge
   - Prop: `dragEnabled = true` (but parent disables it)
   - Status: **WORKS WITH NATIVE** (just needs draggable attribute)

### Library-Specific Features Used

1. **`dndzone` directive:**
   - Config: `{ items, flipDurationMs, type, dragDisabled }`
   - **Replacement:** Native `draggable` + event handlers

2. **Events:**
   - `consider` - Fires during drag
   - `finalize` - Fires on drop
   - **Replacement:** `dragstart`, `dragover`, `drop`, `dragend`

## Migration Strategy

1. Enhance `NativeDragLane.svelte`
2. Update `BushingOrchestrator.svelte` 
3. Update `BushingDraggableCard.svelte`
4. Remove `svelte-dnd-action` from package.json

## Files to Modify
- `src/lib/components/bushing/NativeDragLane.svelte` ✅
- `src/lib/components/bushing/BushingOrchestrator.svelte` ✅
- `src/lib/components/bushing/BushingDraggableCard.svelte` ✅
- `package.json` ✅

## Effort: 4.5-6.5 hours total

**Status:** ✅ READY FOR GATE 2
