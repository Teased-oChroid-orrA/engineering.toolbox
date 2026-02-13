# Native Drag-and-Drop Migration - Quick Reference

## Plan Location
`implementation/NATIVE_DND_MIGRATION_PLAN_V1.md`

## Current Status: READY TO START

### Batch 1: Remove Broken Library + Native HTML5 (Gates 1-5)
- [x] Gate 1: Audit complete
- [ ] Gate 2: Implement native drag
- [ ] Gate 3: Replace BushingSortableLane
- [ ] Gate 4: Remove svelte-dnd-action
- [ ] Gate 5: Batch 1 validation

### Execution Commands
```bash
# Check current state
npm run check

# After changes
npm run verify:dnd-integrity
npm run verify:bushing-dnd

# Full regression
npm run verify:bushing-regression
```

### Files Ready
- ✅ `implementation/NATIVE_DND_MIGRATION_PLAN_V1.md` - Master plan
- ✅ `implementation/native-dnd-v1/batch-1/GATE-001-AUDIT.md` - Audit complete
- ✅ `src/lib/components/bushing/NativeDragLane.svelte` - Skeleton ready

### Next Action
Execute **Gate 2: Enhance NativeDragLane.svelte** with full HTML5 drag-and-drop

## Quick Links
- Plan: `implementation/NATIVE_DND_MIGRATION_PLAN_V1.md`
- Audit: `implementation/native-dnd-v1/batch-1/GATE-001-AUDIT.md`
- Native impl: `src/lib/components/bushing/NativeDragLane.svelte`
- Issue doc: `.github/DRAG_DROP_ISSUE.md`
