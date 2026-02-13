# Native Drag-and-Drop Migration & Optimization Plan V1

**Status:** Ready for Execution  
**Created:** 2026-02-13  
**Priority:** High (Current implementation broken with Svelte 5)

## Executive Summary

Remove the broken `svelte-dnd-action` dependency and implement native HTML5 drag-and-drop with additional optimizations and library dependency reduction.

**Key Objectives:**
1. Remove `svelte-dnd-action` completely
2. Implement native HTML5 drag-and-drop (no external deps)
3. Audit and reduce other unnecessary library dependencies
4. Optimize performance (reduce bundle size, improve DX)
5. Add comprehensive testing and regression prevention

## Current State

### What's Broken
- `svelte-dnd-action` v0.9.69 incompatible with Svelte 5
- Error: `TypeError: can't access property "parentElement", originalDragTarget is undefined`
- Drag-and-drop disabled by default (DnD broken, buttons work)

### What Works
- ✅ Card rendering
- ✅ Up/Down button reordering
- ✅ Layout persistence
- ✅ Duplicate key protection
- ✅ Architecture checks

### Files Involved
- `src/lib/components/bushing/BushingSortableLane.svelte` (wrapper for broken lib)
- `src/lib/components/bushing/BushingDraggableCard.svelte` (drag handle)
- `src/lib/components/bushing/BushingOrchestrator.svelte` (dndEnabled = false)
- `src/lib/components/bushing/NativeDragLane.svelte` (skeleton ready)

## Execution Rule

- Execute in batches of 5 gates
- Do not start next batch until current batch passes verification
- Keep `npm run check` green at every batch boundary
- Keep `npm run verify:bushing-regression` green after Batch 2

---

## Batch 1 (Gates 1-5): Remove Broken Library + Native HTML5 Foundation

### Gate 1 (NATIVE-001): Audit Current DnD Usage
**Objective:** Document all usages of `svelte-dnd-action` in codebase

**Tasks:**
- Search for `svelte-dnd-action` imports
- Search for `dndzone` usage
- Document all components using drag-and-drop
- Identify any dependencies on library-specific features

**Deliverables:**
- `implementation/native-dnd-v1/AUDIT.md` - Complete usage audit
- List of files to modify

**Exit Criteria:**
- Complete list of all DnD usage points
- No surprises during removal

---

### Gate 2 (NATIVE-002): Native HTML5 Drag Implementation
**Objective:** Complete native drag-and-drop implementation

**Tasks:**
1. Enhance `NativeDragLane.svelte`:
   - Full HTML5 drag-and-drop API
   - Touch device support (optional)
   - Keyboard accessibility (arrow keys)
   - Proper ARIA attributes
   - Visual feedback (drag preview, drop zones)
   - Smooth animations

2. Create supporting utilities:
   - `src/lib/components/bushing/dragUtils.ts` - Helper functions
   - Drag event types
   - Position calculations
   - Animation helpers

**Deliverables:**
- Fully functional `NativeDragLane.svelte`
- `dragUtils.ts` utility module
- No external dependencies

**Exit Criteria:**
- Drag-and-drop works smoothly
- No console errors
- Cards don't disappear
- Reorder persists to localStorage

---

### Gate 3 (NATIVE-003): Replace BushingSortableLane
**Objective:** Swap broken wrapper with native implementation

**Tasks:**
1. Update `BushingOrchestrator.svelte`:
   - Replace `BushingSortableLane` with `NativeDragLane`
   - Update event handlers
   - Enable drag by default: `dndEnabled = true`
   - Remove `svelte-dnd-action` specific logic

2. Update `BushingDraggableCard.svelte`:
   - Add proper drag handle styling
   - Add `draggable` attribute handling
   - Add visual feedback during drag

**Deliverables:**
- Updated orchestrator using native drag
- Updated draggable card component
- All cards draggable

**Exit Criteria:**
- Both left and right lanes drag correctly
- No errors in console
- `npm run check` passes

---

### Gate 4 (NATIVE-004): Remove svelte-dnd-action Dependency
**Objective:** Remove the broken library from package.json

**Tasks:**
1. Remove from dependencies:
   ```bash
   npm uninstall svelte-dnd-action
   ```

2. Delete old files:
   - Remove `BushingSortableLane.svelte` (if no longer needed)
   - Or repurpose it as wrapper for `NativeDragLane`

3. Update imports across codebase

**Deliverables:**
- `svelte-dnd-action` removed from `package.json`
- No import errors
- Clean build

**Exit Criteria:**
- `npm install` succeeds
- `npm run build` succeeds
- No missing dependency errors

---

### Gate 5 (NATIVE-005): Batch 1 Validation
**Objective:** Verify native drag works completely

**Tests:**
- `npm run check` - Must pass
- `npm run dev` - No console errors
- Manual drag test - All cards draggable
- Reorder persistence - Survives reload
- Up/Down buttons - Still work as fallback

**Deliverables:**
- Test report documenting all scenarios
- Screenshots/video of working drag

**Exit Criteria:**
- All tests pass
- No regressions
- Drag-and-drop fully functional

---

## Batch 2 (Gates 6-10): Testing & Regression Prevention

### Gate 6 (NATIVE-006): Playwright E2E Tests
**Objective:** Add comprehensive drag-and-drop tests

**Tasks:**
1. Create `tests/bushing-native-drag.spec.ts`:
   - Test drag-and-drop within left lane
   - Test drag-and-drop within right lane
   - Test cards don't disappear during drag
   - Test reorder persists to localStorage
   - Test drag cancellation (ESC key)
   - Test keyboard navigation (if implemented)

2. Add visual regression tests:
   - Drag start state
   - Drag over state
   - Drop complete state

**Deliverables:**
- `tests/bushing-native-drag.spec.ts` - Comprehensive test suite
- Test passes in CI

**Exit Criteria:**
- All drag tests pass
- No flaky tests
- Coverage of all drag scenarios

---

### Gate 7 (NATIVE-007): Update Verification Scripts
**Objective:** Update integrity checks for native implementation

**Tasks:**
1. Update `scripts/verify-dnd-integrity.mjs`:
   - Remove checks for `svelte-dnd-action` patterns
   - Add checks for native HTML5 patterns
   - Verify `NativeDragLane` usage
   - Verify `draggable` attributes
   - Verify event handlers (dragstart, dragover, drop, dragend)

2. Add to regression suite:
   - Update `verify:bushing-regression` to include native drag tests

**Deliverables:**
- Updated verification script
- Passes all checks

**Exit Criteria:**
- `npm run verify:dnd-integrity` passes
- `npm run verify:bushing-regression` passes (includes drag tests)

---

### Gate 8 (NATIVE-008): Performance Benchmarking
**Objective:** Measure performance improvements

**Tasks:**
1. Create benchmark script `scripts/benchmark-drag.mjs`:
   - Measure drag operation latency
   - Measure memory usage during drag
   - Compare bundle size (before/after removing lib)

2. Run benchmarks:
   - Document baseline with library
   - Document performance with native implementation

**Deliverables:**
- `scripts/benchmark-drag.mjs`
- Performance report showing improvements

**Exit Criteria:**
- Bundle size reduced (no library overhead)
- Drag latency ≤ library version
- No memory leaks during repeated drags

---

### Gate 9 (NATIVE-009): Accessibility Audit
**Objective:** Ensure drag-and-drop is accessible

**Tasks:**
1. Keyboard navigation:
   - Arrow keys to reorder
   - Space to grab/release
   - Escape to cancel

2. Screen reader support:
   - Proper ARIA labels
   - Live region announcements
   - Drag state communicated

3. Focus management:
   - Focus follows dragged item
   - Focus restored after drop

**Deliverables:**
- Accessibility implementation
- Documentation of keyboard shortcuts

**Exit Criteria:**
- Passes axe accessibility checks
- Keyboard-only navigation works
- Screen reader announces drag operations

---

### Gate 10 (NATIVE-010): Batch 2 Validation
**Objective:** Full regression + performance validation

**Tests:**
- `npm run verify:bushing-regression` - Full suite
- `npm run verify:dnd-integrity` - Native checks
- `npm run verify:bushing-dnd` - E2E drag tests
- Performance benchmarks - Within targets
- Accessibility audit - No violations

**Exit Criteria:**
- All tests pass
- Performance improved
- Accessibility compliant
- No regressions

---

## Batch 3 (Gates 11-15): Library Dependency Audit & Optimization

### Gate 11 (NATIVE-011): Dependency Audit
**Objective:** Identify reducible dependencies

**Tasks:**
1. Audit current dependencies in `package.json`:
   - `@formkit/auto-animate` (1 usage?) - Can we remove?
   - `@floating-ui/dom` - Is it used? Can we use CSS instead?
   - `clsx` / `tailwind-merge` - Can be replaced with simple function
   - `@number-flow/svelte` - Is it necessary?
   - `@svar-ui/svelte-filter` - Used where?

2. For each dependency:
   - Document all usage locations
   - Assess if replaceable with native code
   - Calculate bundle size impact
   - Estimate migration effort

**Deliverables:**
- `implementation/native-dnd-v1/DEPENDENCY_AUDIT.md`
- List of candidates for removal
- Priority ranking (bundle size / effort ratio)

**Exit Criteria:**
- Complete audit of all dependencies
- Clear candidates identified
- Effort estimated

---

### Gate 12 (NATIVE-012): Remove Low-Hanging Fruit
**Objective:** Remove easily replaceable dependencies

**Candidates:**
1. **`clsx` / `tailwind-merge`:**
   - Replace with simple `cn()` function
   - ~5KB bundle savings

2. **`@formkit/auto-animate`:**
   - Replace with CSS transitions
   - If only used in 1-2 places, native animation better

3. **`@floating-ui/dom`:**
   - If only for simple tooltips, use CSS
   - If complex positioning needed, keep it

**Tasks:**
- Implement replacements
- Update all usage points
- Test thoroughly
- Remove from package.json

**Deliverables:**
- Reduced dependency count
- Native implementations
- No functionality loss

**Exit Criteria:**
- Dependencies removed
- Tests pass
- Bundle size reduced
- No regressions

---

### Gate 13 (NATIVE-013): Bundle Size Optimization
**Objective:** Optimize final bundle size

**Tasks:**
1. Analyze bundle:
   ```bash
   npm run build
   # Analyze build output
   ```

2. Tree-shaking verification:
   - Ensure unused code eliminated
   - Check for duplicate dependencies

3. Code splitting:
   - Lazy load heavy components
   - Split routes properly

4. Image optimization:
   - Compress assets
   - Use modern formats (WebP, AVIF)

**Deliverables:**
- Bundle analysis report
- Optimized build configuration
- Documentation of optimizations

**Exit Criteria:**
- Bundle size reduced by ≥20% (from library removal + optimizations)
- Load time improved
- No functionality loss

---

### Gate 14 (NATIVE-014): Developer Experience Improvements
**Objective:** Make drag-and-drop easier to maintain

**Tasks:**
1. Documentation:
   - Update `.github/copilot-instructions.md`
   - Add drag-and-drop implementation guide
   - Document native API patterns

2. Type safety:
   - Improve TypeScript types for drag events
   - Add JSDoc comments

3. Developer tools:
   - Add debug mode for drag operations
   - Console logs for drag state (dev only)

**Deliverables:**
- Updated documentation
- Better type definitions
- Debug utilities

**Exit Criteria:**
- New developers can understand drag implementation
- TypeScript errors helpful
- Debug mode aids troubleshooting

---

### Gate 15 (NATIVE-015): Batch 3 Validation + Final Release
**Objective:** Complete validation and documentation

**Tests:**
- `npm run check` - All checks pass
- `npm run verify:bushing-regression` - Full suite
- `npm run build` - Production build succeeds
- Bundle size analysis - Target met
- Load time test - Improved
- Manual QA - All features work

**Deliverables:**
- Complete test report
- Performance comparison (before/after)
- Updated documentation
- Release notes

**Exit Criteria:**
- All tests pass
- Documentation complete
- Ready for production
- No known issues

---

## Batch 4 (Gates 16-20): Advanced Features (Optional)

### Gate 16 (NATIVE-016): Touch Device Support
**Objective:** Mobile drag-and-drop

**Tasks:**
- Add touch event handlers
- Test on mobile devices
- Adjust visual feedback for touch

**Exit Criteria:**
- Works on iOS/Android
- Touch interactions smooth

---

### Gate 17 (NATIVE-017): Multi-Column Drag
**Objective:** Drag between left/right lanes

**Tasks:**
- Enable cross-lane dragging
- Update drop zone detection
- Handle column constraints

**Exit Criteria:**
- Can drag from left to right
- Can drag from right to left
- Constraints respected

---

### Gate 18 (NATIVE-018): Drag Animations
**Objective:** Polish drag experience

**Tasks:**
- Smooth ghost element
- Drop zone highlighting
- Spring-based reordering animation

**Exit Criteria:**
- Animations feel natural
- No jank or stuttering
- Respects prefers-reduced-motion

---

### Gate 19 (NATIVE-019): Undo/Redo
**Objective:** History for card reordering

**Tasks:**
- Implement history stack
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- UI indicators

**Exit Criteria:**
- Can undo drag operations
- Can redo undone operations
- Keyboard shortcuts work

---

### Gate 20 (NATIVE-020): Final Polish
**Objective:** Production-ready state

**Tasks:**
- Final QA pass
- Performance tuning
- Documentation polish
- Release preparation

**Exit Criteria:**
- Production-ready
- All stakeholders approve
- Documentation complete

---

## Success Metrics

### Performance Targets
- Bundle size reduction: **≥20%** (removing library + optimizations)
- Drag operation latency: **≤50ms**
- Memory usage: **No leaks** after 100 drag operations
- Load time: **≥15% faster** (reduced bundle)

### Quality Targets
- Test coverage: **≥90%** for drag-and-drop code
- Accessibility score: **100** (axe)
- Zero console errors during drag operations
- Zero regressions in existing tests

### Maintainability Targets
- Code complexity: **≤10** cyclomatic complexity per function
- Documentation: **100%** of public APIs documented
- Type safety: **Zero `any` types** in drag code

---

## Risk Assessment

### High Risk
- **Touch device compatibility** - May need extensive testing
  - Mitigation: Test early on real devices

### Medium Risk
- **Performance regression** - Native implementation slower than library
  - Mitigation: Benchmark early, optimize hot paths

- **Accessibility gaps** - Missing keyboard/screen reader support
  - Mitigation: Follow ARIA best practices, test with real users

### Low Risk
- **Breaking existing tests** - Well-tested, easy to catch
  - Mitigation: Run regression after each gate

---

## Rollback Plan

If native implementation fails:
1. Revert to `dndEnabled = false`
2. Keep Up/Down buttons as primary interface
3. Wait for `svelte-dnd-action` Svelte 5 update
4. Or try alternative library (`@dnd-kit`, `pragmatic-drag-and-drop`)

---

## Timeline Estimate

- **Batch 1** (Gates 1-5): 4-6 hours
- **Batch 2** (Gates 6-10): 4-6 hours  
- **Batch 3** (Gates 11-15): 6-8 hours
- **Batch 4** (Gates 16-20): Optional, 8-10 hours if needed

**Total:** 14-20 hours for core implementation (Batches 1-3)

---

## Dependencies

### Required Before Starting
- ✅ `npm run check` passes
- ✅ Current drag-and-drop disabled
- ✅ Up/Down buttons working

### Required for Completion
- Batch 1: Native drag implementation
- Batch 2: Testing + regression prevention
- Batch 3: Optimization + cleanup

---

## Notes

- **Native HTML5 is the right choice** - No library dependencies, full control, Svelte 5 compatible
- **Don't rush** - Each gate has clear exit criteria, validate before moving on
- **Test on real devices** - Especially for touch support (Batch 4)
- **Keep it simple** - Don't over-engineer, native API is straightforward
- **Performance first** - Drag operations must be smooth (≤50ms latency)

---

## Execution Checklist

Before starting:
- [ ] Read full plan
- [ ] Understand gate structure
- [ ] Review current codebase
- [ ] Backup current state (git commit)

After each batch:
- [ ] Run all verification scripts
- [ ] Manual QA test
- [ ] Document any issues
- [ ] Git commit with batch number

After completion:
- [ ] Full regression test
- [ ] Performance benchmarks
- [ ] Documentation update
- [ ] Release notes
- [ ] Mark plan as COMPLETE

---

**Let's build robust, native drag-and-drop with zero dependencies! 🚀**
