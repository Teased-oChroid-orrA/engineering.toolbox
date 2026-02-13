# Bushing Card Container Fix Plan V1

## 1. Objective
Fix the issue where bushing toolbox cards disappear after being dragged and released. Rewire the cards to be within a main container so that all cards can be repositioned anywhere on the screen.

## 2. Problem Statement
- **Current Behavior**: When dragging a card to reposition it, the card disappears once the drag is released
- **Root Cause**: 
  - Reactive statements in BushingOrchestrator recreate item arrays on every state change
  - DOM re-renders interrupt FLIP animations during the finalize event
  - State updates happen before animation completes (200ms flipDurationMs)
  - Container structure doesn't support free positioning across the screen

## 3. Requirements
### Functional Requirements
1. Cards must remain visible after drag-and-drop operations
2. Cards must be repositionable anywhere on the screen (not just within lanes)
3. Card order and position must persist across page reloads
4. All existing card functionality must continue to work (collapse, expand, move up/down)
5. Must maintain compatibility with existing tests

### Technical Requirements
1. Follow architecture constraints in `implementation/bushing-dnd-nested-reorder-plan-v1/PLAN.md`
2. Maintain file size policy compliance
3. Use existing `svelte-dnd-action` library
4. Preserve existing persistence keys or migrate gracefully
5. Support both mouse and keyboard interactions

## 4. Solution Approach
### Phase 1: Fix Immediate Card Disappearing Issue
- **Goal**: Prevent cards from disappearing during drag operations
- **Implementation**:
  1. Add setTimeout delay in finalize handlers to allow FLIP animation to complete
  2. Use stable item references instead of reactive recreations
  3. Prevent premature DOM updates during drag operations

### Phase 2: Implement Free Positioning Container
- **Goal**: Enable cards to be positioned anywhere on screen
- **Implementation**:
  1. Create a single main container component for all cards
  2. Use absolute/fixed positioning for cards
  3. Store x,y coordinates in addition to order
  4. Update persistence layer to store positions
  5. Implement snap-to-grid or guide lines for better UX

## 5. Architecture Changes

### 5.1 Component Changes
- **BushingOrchestrator.svelte**:
  - Replace reactive array recreations with stable references
  - Add animation delay to finalize handlers
  - Migrate to single container model

- **BushingSortableLane.svelte**:
  - Prevent workingItems sync during active drag
  - Add drag state tracking
  - Defer state updates until animation completes

- **BushingDraggableCard.svelte**:
  - Support absolute positioning mode
  - Add position state (x, y)
  - Maintain backward compatibility with lane mode

### 5.2 New Components
- **BushingCardContainer.svelte** (new):
  - Main container for all cards
  - Handles free positioning
  - Provides drop zones
  - Manages card positioning state

### 5.3 Persistence Updates
- **Migration Path**: `scd.bushing.layout.v3` → `scd.bushing.layout.v4`
- **New Structure**:
  ```json
  {
    "version": 4,
    "mode": "lanes" | "free",
    "leftCardOrder": ["header", "guidance", ...],
    "rightCardOrder": ["drafting", "summary", ...],
    "cardPositions": {
      "header": { "x": 10, "y": 10 },
      "drafting": { "x": 500, "y": 10 }
    }
  }
  ```

## 6. Implementation Gates

### Gate 1: Reproduce and Instrument
- [x] Reproduce card disappearing issue
- [x] Add logging to understand event sequence
- [x] Document root cause

### Gate 2: Fix Card Disappearing
- [ ] Add setTimeout to finalize handlers (200ms)
- [ ] Replace reactive array recreations
- [ ] Add drag state tracking
- [ ] Test with existing drag operations
- [ ] Verify no disappearing issues

### Gate 3: Implement Free Positioning (Optional for MVP)
- [ ] Create BushingCardContainer component
- [ ] Add position tracking to cards
- [ ] Update persistence layer
- [ ] Implement position UI controls
- [ ] Test free positioning

### Gate 4: Testing and Validation
- [ ] Update existing Playwright tests
- [ ] Add new tests for drag behavior
- [ ] Manual testing with all card types
- [ ] Verify persistence works
- [ ] Check file size policy compliance

### Gate 5: Documentation and Rollout
- [ ] Update BUSHING_TOOLBOX_README.md
- [ ] Document new persistence format
- [ ] Add rollback procedure
- [ ] Create release notes

## 7. Testing Strategy

### Automated Tests
1. **Drag and Drop Tests**:
   - Drag card within lane and verify it stays
   - Drag card between lanes and verify position
   - Drag nested diagnostics cards
   - Verify persistence after reload

2. **Regression Tests**:
   - All existing bushing tests must pass
   - Card layout panel controls
   - Collapse/expand functionality
   - Export functionality

### Manual Tests
1. Drag first card to last position
2. Drag last card to first position
3. Drag cards with page scroll
4. Drag in collapsed state
5. Drag with keyboard fallback controls
6. Test on different screen sizes

## 8. Risk Mitigation

### Risks
1. **Animation timing issues**: FLIP animation may not complete consistently
   - Mitigation: Make timeout configurable, add fallback
2. **State synchronization**: Multiple state updates could conflict
   - Mitigation: Use single source of truth, batch updates
3. **Performance**: Free positioning could impact render performance
   - Mitigation: Use virtualization if needed, optimize re-renders
4. **File size policy**: New code could exceed limits
   - Mitigation: Keep changes minimal, reuse existing utilities

## 9. Rollback Plan
- Feature can be disabled via localStorage flag: `scd.bushing.dnd.enabled`
- Persistence migration is forward-compatible
- Old layout format (v3) remains readable
- Cards fall back to lane mode if free positioning fails

## 10. Success Criteria
1. ✅ Cards do not disappear after drag-and-drop
2. ✅ Cards can be repositioned within their lane
3. ✅ Position persists across page reloads
4. ✅ All existing tests pass
5. ✅ No file size policy violations
6. ✅ Manual QA matrix complete

## 11. Timeline Estimate
- Gate 1: Complete (analysis done)
- Gate 2: 2-4 hours (fix disappearing issue)
- Gate 3: 4-6 hours (implement free positioning - optional)
- Gate 4: 2-3 hours (testing)
- Gate 5: 1-2 hours (documentation)

**Total**: 9-15 hours (or 4-7 hours for MVP without free positioning)
