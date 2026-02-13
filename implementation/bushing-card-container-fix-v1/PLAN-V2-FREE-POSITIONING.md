# Bushing Card Free Positioning Plan V2

## Executive Summary
This plan addresses critical issues with the bushing toolbox card system and implements true free positioning across the entire webpage to eliminate dead space and enable flexible layouts.

## Current Issues
1. **Cards still disappear** - 250ms timeout insufficient for some operations
2. **No cross-lane movement** - cards stuck in left/right columns
3. **Right column drags entire container** - all 3 cards move together
4. **Fixed layout wastes space** - cannot reduce dead space

## Architecture Analysis

### Current State
```
BushingOrchestrator.svelte
  └─ <div class="grid grid-cols-[450px_1fr]">  ← Fixed 2-column grid
       ├─ BushingSortableLane (left)            ← Separate lane
       │    └─ 6 cards (header, guidance, setup, ...)
       └─ BushingRightLaneCards
            └─ BushingSortableLane (right)      ← Wraps all 3 cards
                 └─ 3 cards (drafting, summary, diagnostics)
```

**Problems:**
- Fixed grid prevents flexible positioning
- Separate lanes prevent cross-lane dragging
- Right lane wrapper causes all cards to move together
- `svelte-dnd-action` is designed for sortable lists, not free positioning

### Target State
```
BushingOrchestrator.svelte
  └─ <div class="relative w-full h-screen overflow-auto">  ← Free positioning container
       ├─ Card (x: 10, y: 10, w: 450, h: auto)
       ├─ Card (x: 480, y: 10, w: 600, h: auto)
       ├─ Card (x: 10, y: 300, w: 450, h: auto)
       └─ ... (9 cards total, positioned anywhere)
```

**Benefits:**
- Cards can be positioned anywhere on screen
- No wasted space
- Intuitive drag-and-drop
- Persistent custom layouts

## Solution Options

### Option A: Keep svelte-dnd-action + Single Lane ⚠️
**Pros:** Minimal changes, keep existing library
**Cons:** Still constrained to list-based layout, complex workarounds needed
**Recommendation:** ❌ Not suitable for free positioning

### Option B: Switch to @dnd-kit ⚠️
**Pros:** Modern, flexible, supports free positioning
**Cons:** React-focused (needs Svelte adapter), larger bundle, learning curve
**Recommendation:** ⚠️ Possible but overkill

### Option C: Native Drag & Drop with Absolute Positioning ✅
**Pros:** 
- Zero dependencies
- Full control
- Perfect for free positioning
- Smallest bundle size
- No timing issues

**Cons:**
- Need to implement collision detection
- Need to handle edge cases
- More code to write (but simpler)

**Recommendation:** ✅ **BEST CHOICE** - Clean, simple, maintainable

## Implementation Plan

### Phase 1: Quick Fixes (2-3 hours)
**Goal:** Make current system more reliable

#### Ticket BCC-004: Increase Finalize Timeout
- Increase timeout from 250ms to 500ms
- Add configurable timeout constant
- Test with Playwright to verify no disappearing
- **Files:** `BushingSortableLane.svelte`
- **Priority:** HIGH

#### Ticket BCC-005: Fix Right Column Container Issue
- Remove `BushingRightLaneCards` wrapper
- Inline right cards into orchestrator
- Each card should be individually draggable
- **Files:** `BushingOrchestrator.svelte`, remove `BushingRightLaneCards.svelte`
- **Priority:** HIGH

### Phase 2: Free Positioning Implementation (6-8 hours)
**Goal:** Enable drag-to-position anywhere on screen

#### Ticket BCC-006: Create Free Positioning Container
- New component: `BushingFreePositionContainer.svelte`
- Use CSS absolute positioning
- Implement native drag events
- Store card positions (x, y, width, height)
- **Priority:** HIGH

#### Ticket BCC-007: Implement Card Dragging Logic
- Add drag handles with native `dragstart`, `drag`, `dragend` events
- Calculate drop position from mouse coordinates
- Update card position in state
- Smooth transition animations
- **Priority:** HIGH

#### Ticket BCC-008: Position Persistence
- Migrate from `scd.bushing.layout.v3` to `scd.bushing.layout.v4`
- New format:
```json
{
  "version": 4,
  "mode": "free",
  "cards": {
    "header": {"x": 10, "y": 10, "width": 450},
    "guidance": {"x": 10, "y": 150, "width": 450},
    "drafting": {"x": 480, "y": 10, "width": 750}
  }
}
```
- Backward compatibility with v3 (generate default positions)
- **Priority:** MEDIUM

#### Ticket BCC-009: Grid Snapping & Collision Detection
- Implement 10px grid snapping
- Detect overlapping cards
- Visual feedback for valid drop zones
- Auto-adjust positions to prevent overlap
- **Priority:** MEDIUM

### Phase 3: Polish & Testing (3-4 hours)

#### Ticket BCC-010: Visual Enhancements
- Add drag preview/ghost
- Visual guides (snap lines)
- Highlight drop zone
- Smooth animations
- **Priority:** LOW

#### Ticket BCC-011: Reset Layout Button
- Add "Reset to Default Layout" button
- Confirm dialog before reset
- Restore default positions
- **Priority:** LOW

#### Ticket BCC-012: Comprehensive Playwright Tests
- Test drag to different positions
- Test position persistence after reload
- Test all 9 cards individually
- Test collision detection
- Test edge cases (drag outside bounds)
- **Priority:** HIGH

## Technical Implementation Details

### Native Drag & Drop Implementation

**Card Component Structure:**
```svelte
<script lang="ts">
  export let cardId: string;
  export let x: number;
  export let y: number;
  export let width: number = 450;
  export let onPositionChange: (id: string, x: number, y: number) => void;
  
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let offsetX = 0;
  let offsetY = 0;
  
  function handleDragStart(e: DragEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    offsetX = x;
    offsetY = y;
  }
  
  function handleDrag(e: DragEvent) {
    if (!isDragging || e.clientX === 0) return;
    const newX = offsetX + (e.clientX - dragStartX);
    const newY = offsetY + (e.clientY - dragStartY);
    // Apply grid snapping
    x = Math.round(newX / 10) * 10;
    y = Math.round(newY / 10) * 10;
  }
  
  function handleDragEnd(e: DragEvent) {
    isDragging = false;
    onPositionChange(cardId, x, y);
  }
</script>

<div 
  class="absolute"
  style="left: {x}px; top: {y}px; width: {width}px;"
  draggable="true"
  on:dragstart={handleDragStart}
  on:drag={handleDrag}
  on:dragend={handleDragEnd}>
  <div class="drag-handle cursor-move">...</div>
  <slot />
</div>
```

**Container Component:**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  export let cards: Array<{id: string, x: number, y: number, width: number}>;
  
  function handlePositionChange(id: string, x: number, y: number) {
    cards = cards.map(card => 
      card.id === id ? {...card, x, y} : card
    );
    saveLayout();
  }
  
  function saveLayout() {
    const layout = {
      version: 4,
      mode: 'free',
      cards: Object.fromEntries(
        cards.map(c => [c.id, {x: c.x, y: c.y, width: c.width}])
      )
    };
    localStorage.setItem('scd.bushing.layout.v4', JSON.stringify(layout));
  }
  
  onMount(() => {
    loadLayout();
  });
</script>

<div class="relative w-full min-h-screen overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
  {#each cards as card (card.id)}
    <BushingFreePositionCard 
      {card}
      onPositionChange={handlePositionChange}>
      <slot name={card.id} />
    </BushingFreePositionCard>
  {/each}
</div>
```

## Migration Strategy

### Step 1: Implement Free Positioning (Parallel)
- Create new components in parallel
- Don't break existing code
- Use feature flag: `scd.bushing.freePositioning.enabled`

### Step 2: Test Thoroughly
- Comprehensive Playwright tests
- Manual testing on different screen sizes
- Performance testing

### Step 3: Gradual Rollout
- Enable for dev/testing
- Collect feedback
- Fix issues
- Enable for production

### Step 4: Remove Old Code
- Delete `BushingSortableLane.svelte`
- Delete `BushingRightLaneCards.svelte`
- Remove `svelte-dnd-action` dependency
- Clean up layout persistence code

## Default Positions

**Left Column Cards (x=10):**
- header: (10, 10)
- guidance: (10, 180)
- setup: (10, 400)
- geometry: (10, 650)
- profile: (10, 950)
- process: (10, 1250)

**Right Column Cards (x=480):**
- drafting: (480, 10)
- summary: (480, 600)
- diagnostics: (480, 1100)

## Testing Strategy

### Unit Tests
- Position calculation
- Grid snapping logic
- Collision detection
- Layout persistence

### Integration Tests (Playwright)
```typescript
test('drag card to new position', async ({ page }) => {
  await page.goto('/#/bushing');
  
  const card = page.locator('[data-card-id="header"]');
  const box = await card.boundingBox();
  
  // Drag card 200px right and 100px down
  await card.dragTo(page.locator('body'), {
    targetPosition: { x: box.x + 200, y: box.y + 100 }
  });
  
  // Verify new position
  const newBox = await card.boundingBox();
  expect(newBox.x).toBeCloseTo(box.x + 200, -1);
  expect(newBox.y).toBeCloseTo(box.y + 100, -1);
  
  // Reload and verify persistence
  await page.reload();
  const afterReload = await card.boundingBox();
  expect(afterReload.x).toBe(newBox.x);
  expect(afterReload.y).toBe(newBox.y);
});

test('all cards are independently draggable', async ({ page }) => {
  await page.goto('/#/bushing');
  
  const cards = ['header', 'guidance', 'setup', 'geometry', 'profile', 
                 'process', 'drafting', 'summary', 'diagnostics'];
  
  for (const cardId of cards) {
    const card = page.locator(`[data-card-id="${cardId}"]`);
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('draggable', 'true');
  }
});
```

## Risk Assessment

### High Risk
- **Migration complexity** - Moving from lane-based to free positioning
- **Mitigation:** Feature flag, thorough testing, gradual rollout

### Medium Risk
- **Performance** - 9 draggable elements
- **Mitigation:** Use CSS transforms, debounce position updates

### Low Risk
- **Browser compatibility** - Native drag & drop support
- **Mitigation:** Well-supported by all modern browsers

## Success Criteria
1. ✅ Cards don't disappear during drag
2. ✅ Any card can be dragged anywhere on screen
3. ✅ Positions persist across page reloads
4. ✅ No wasted space - efficient layout
5. ✅ All cards are individually draggable
6. ✅ Smooth drag experience
7. ✅ Comprehensive test coverage

## Timeline

**Week 1:**
- Day 1-2: Phase 1 (Quick fixes)
- Day 3-5: Phase 2 (Free positioning core)

**Week 2:**
- Day 1-2: Phase 2 (Persistence & snapping)
- Day 3: Phase 3 (Polish)
- Day 4-5: Testing & bug fixes

**Total: 10 days (11-15 hours actual work)**

## Approval Required
- [ ] User approves free positioning approach
- [ ] User approves native drag & drop (vs library)
- [ ] User approves timeline and scope
