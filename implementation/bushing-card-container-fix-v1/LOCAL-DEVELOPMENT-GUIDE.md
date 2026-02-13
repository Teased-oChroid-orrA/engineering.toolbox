# Local Development Guide - Continue on Your Machine

## Quick Start: Pull the Current Work

To continue this work on your local machine, follow these steps:

### 1. Pull the Branch

```bash
# Navigate to your local clone of the repository
cd /path/to/engineering.toolbox

# Fetch all branches from remote
git fetch origin

# Checkout the working branch
git checkout copilot/rewire-bushing-toolbox-cards

# Make sure you're up to date
git pull origin copilot/rewire-bushing-toolbox-cards
```

### 2. Install Dependencies

```bash
# Install npm dependencies
npm ci

# Verify everything is working
npm run check
npm run build
```

### 3. Current Branch Information

**Branch Name:** `copilot/rewire-bushing-toolbox-cards`  
**Latest Commit:** `52e8394` - Fix CI TypeScript errors in free positioning card slots  
**Status:** ✅ All CI TypeScript errors fixed, core infrastructure complete

## What Has Been Completed

### Phase 1: Immediate Fixes ✅
- [x] Increased drag finalize timeout from 250ms to 500ms
- [x] Fixed right column container - removed wrapper, cards now individually draggable
- [x] Fixed CI TypeScript errors (property names and props)

### Phase 2A: Free Positioning Infrastructure ✅
- [x] Created `BushingCardPositionController.ts` - Position management, grid snapping, collision detection
- [x] Created `BushingFreePositionCard.svelte` - Individual draggable card with native HTML5 drag & drop
- [x] Created `BushingFreePositionContainer.svelte` - Main container managing 9 card positions
- [x] Updated `BushingOrchestrator.svelte` - Feature flag support
- [x] Comprehensive evaluation document created (`PATH-B-EVALUATION.md`)

### Documentation Created ✅
All in `implementation/bushing-card-container-fix-v1/`:
- `PATH-B-EVALUATION.md` - Complete technical analysis with optimization recommendations
- `PLAN-V2-FREE-POSITIONING.md` - Detailed implementation plan
- `EXECUTIVE-SUMMARY.md` - Business case and recommendations
- `SUMMARY.md` - Implementation summary
- `README.md` - Quick reference guide
- Tickets: BCC-001 through BCC-005

## What Needs to Be Done Next

### Priority 1: Critical Fixes (1 hour)

#### Fix #1: Feature Flag Not Activating 🔴
**File:** `src/lib/components/bushing/BushingOrchestrator.svelte`

**Problem:** Flag read asynchronously in `onMount()`, component renders before flag is evaluated

**Current Code (lines ~90-95):**
```typescript
let useFreePositioning = false;

onMount(() => {
  const stored = localStorage.getItem(FREE_POSITIONING_KEY);
  if (stored === '1') {
    useFreePositioning = true;
  }
});
```

**Fix Option A - Synchronous Read:**
```typescript
let useFreePositioning = typeof window !== 'undefined' 
  ? localStorage.getItem('scd.bushing.freePositioning.enabled') === '1'
  : false;
```

**Fix Option B - Reactive Statement:**
```typescript
let useFreePositioning = false;
let mounted = false;

onMount(() => {
  mounted = true;
  const stored = localStorage.getItem('scd.bushing.freePositioning.enabled');
  useFreePositioning = stored === '1';
});

$: if (mounted && !useFreePositioning) {
  const stored = localStorage.getItem('scd.bushing.freePositioning.enabled');
  if (stored === '1') {
    useFreePositioning = true;
  }
}
```

#### Fix #2: TypeError in Process Card (Minor) 🟡
**Issue:** Console error when simplified geometry slot tries to access `form.tolerance`

**Resolution:** Already using correct props now, but monitor for any runtime errors

### Priority 2: Testing & Screenshots (1 hour)

1. **Enable Free Positioning Mode:**
```javascript
// In browser console
window.__ENABLE_FREE_POSITIONING__()
// Page will reload
```

2. **Test Dragging:**
- Verify all 9 cards are draggable
- Test drag to different positions
- Verify grid snapping (10px increments)
- Test position persistence (reload page)
- Check collision detection (red outline on overlap)

3. **Take Screenshots:**
- Initial layout with free positioning enabled
- Cards in various positions
- Collision detection example
- After page reload (persistence)

4. **Create Playwright Tests:**
```typescript
// tests/bushing-free-positioning.spec.ts
test('all 9 cards are draggable in free positioning mode', async ({ page }) => {
  await page.goto('/#/bushing');
  await page.evaluate(() => window.__ENABLE_FREE_POSITIONING__());
  await page.reload();
  
  const cards = ['header', 'guidance', 'setup', 'geometry', 
                 'profile', 'process', 'drafting', 'summary', 'diagnostics'];
  
  for (const id of cards) {
    const card = page.locator(`[data-card-id="${id}"]`);
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('draggable', 'true');
  }
});

test('drag card updates position', async ({ page }) => {
  await page.goto('/#/bushing');
  await page.evaluate(() => window.__ENABLE_FREE_POSITIONING__());
  await page.reload();
  
  const card = page.locator('[data-card-id="header"]');
  const initialBox = await card.boundingBox();
  
  await card.dragTo(page.locator('body'), {
    targetPosition: { x: initialBox.x + 200, y: initialBox.y + 100 }
  });
  
  const finalBox = await card.boundingBox();
  expect(finalBox.x).toBeCloseTo(initialBox.x + 200, -1);
  expect(finalBox.y).toBeCloseTo(initialBox.y + 100, -1);
});
```

### Priority 3: Enhancements (3-4 hours)

See `PATH-B-EVALUATION.md` for detailed recommendations:

1. **Use CSS Transforms** (1 hour)
   - Change from `left/top` to `transform: translate()`
   - Hardware-accelerated, smoother performance

2. **Dynamic Viewport Detection** (30 min)
   - Use `window.innerWidth/innerHeight` instead of hardcoded 1920x2000

3. **Scroll Offset Compensation** (30 min)
   - Add `window.scrollX/scrollY` to drag calculations

4. **Smooth Transitions** (30 min)
   - Add CSS transitions for polished feel

5. **Additional Features** (optional):
   - Magnetic snapping during drag
   - Auto-prevent overlaps on drop
   - Touch/mobile support
   - Keyboard navigation

## Using GitHub Copilot Locally

### Setup Copilot in VS Code

1. **Install Extension:**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Search for "GitHub Copilot"
   - Install and sign in with your GitHub account

2. **Verify Access:**
   - Open any `.ts` or `.svelte` file
   - Start typing a comment like `// function to snap to grid`
   - Copilot should suggest code completions

### Copilot Chat Commands

Use these in the Copilot Chat panel:

```
# Ask for help with context
/explain What does the BushingCardPositionController do?

# Get implementation suggestions
@workspace How do I enable free positioning mode in the bushing toolbox?

# Find files
@workspace Where is the drag and drop logic implemented?

# Debug issues
Why is the feature flag not activating when set in localStorage?

# Generate tests
Write a Playwright test for dragging cards in free positioning mode
```

### Useful Copilot Patterns

1. **Complete Implementation:**
```typescript
// TODO: Implement synchronous localStorage read for free positioning flag
let useFreePositioning = 
// Copilot will suggest the implementation
```

2. **Refactor Code:**
```typescript
// Select code block and ask Copilot Chat:
// "Refactor this to use CSS transforms instead of left/top positioning"
```

3. **Add Tests:**
```typescript
// In test file, type:
// test('should persist card positions after reload'
// Copilot will suggest the full test
```

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

Server runs at `http://127.0.0.1:5173`

Navigate to: `http://127.0.0.1:5173/#/bushing`

### 2. Enable Free Positioning

Open browser console (F12) and run:
```javascript
window.__ENABLE_FREE_POSITIONING__()
```

Page will reload with free positioning enabled.

### 3. Disable Free Positioning

```javascript
window.__DISABLE_FREE_POSITIONING__()
```

### 4. Check TypeScript Errors

```bash
npm run check
```

Should show 0 errors, 17 warnings (warnings are expected for unused props)

### 5. Build

```bash
npm run build
```

### 6. Run Tests (once created)

```bash
npm run test
# or
npx playwright test
```

## Key Files to Know

### Free Positioning Components
- `src/lib/components/bushing/BushingCardPositionController.ts` - Position logic
- `src/lib/components/bushing/BushingFreePositionCard.svelte` - Individual card
- `src/lib/components/bushing/BushingFreePositionContainer.svelte` - Container
- `src/lib/components/bushing/BushingOrchestrator.svelte` - Main orchestrator

### Lane-Based Components (Original)
- `src/lib/components/bushing/BushingSortableLane.svelte` - Sortable lane
- `src/lib/components/bushing/BushingDraggableCard.svelte` - Card wrapper

### Layout Persistence
- Uses localStorage key: `scd.bushing.freePositioning.enabled`
- Layout stored in: `scd.bushing.layout.v4`

## Debugging Tips

### 1. Check Feature Flag
```javascript
// In browser console
localStorage.getItem('scd.bushing.freePositioning.enabled')
// Should return '1' if enabled
```

### 2. Check Layout Data
```javascript
// In browser console
JSON.parse(localStorage.getItem('scd.bushing.layout.v4'))
// Should show card positions
```

### 3. Clear State
```javascript
// Reset to defaults
localStorage.removeItem('scd.bushing.layout.v4')
localStorage.removeItem('scd.bushing.freePositioning.enabled')
location.reload()
```

### 4. Check Component Rendering
```javascript
// In BushingOrchestrator component
console.log('Free positioning enabled:', useFreePositioning)
```

## Architecture Overview

```
BushingOrchestrator.svelte
├─ Conditional: useFreePositioning?
│  ├─ TRUE: BushingFreePositionContainer.svelte
│  │   ├─ BushingFreePositionCard (header)
│  │   ├─ BushingFreePositionCard (guidance)
│  │   ├─ BushingFreePositionCard (setup)
│  │   ├─ ... 9 cards total
│  │   └─ Uses BushingCardPositionController for logic
│  └─ FALSE: Lane-based layout (original)
│      ├─ BushingSortableLane (left)
│      └─ BushingSortableLane (right)
└─ Helper functions: __ENABLE_FREE_POSITIONING__(), etc.
```

## Common Issues & Solutions

### Issue: Free Positioning Not Loading
**Solution:** Apply Priority 1 Fix #1 (synchronous flag read)

### Issue: Cards Disappear After Drag
**Solution:** Already fixed - timeout increased to 500ms

### Issue: Cards Overlap
**Solution:** Collision detection shows red outline - manual repositioning needed
(Or implement auto-adjust from Priority 3 enhancements)

### Issue: Position Not Persisting
**Solution:** Check localStorage permissions, verify v4 layout is being saved

### Issue: Build Fails
**Solution:** Run `npm run check` to see TypeScript errors
(All current errors are fixed as of commit 52e8394)

## Git Workflow

### Making Changes

```bash
# Make your changes
# Test them

# Check status
git status

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: your change description"

# Push to remote
git push origin copilot/rewire-bushing-toolbox-cards
```

### Creating a New Branch (if needed)

```bash
# Create new branch from current work
git checkout -b your-feature-branch

# Push new branch
git push -u origin your-feature-branch
```

## Resources

### Documentation References
- Main plan: `implementation/bushing-card-container-fix-v1/PLAN-V2-FREE-POSITIONING.md`
- Evaluation: `implementation/bushing-card-container-fix-v1/PATH-B-EVALUATION.md`
- Executive summary: `implementation/bushing-card-container-fix-v1/EXECUTIVE-SUMMARY.md`

### Related Issues/Tickets
- BCC-001: Fix card disappearing (COMPLETE)
- BCC-004: Increase timeout (COMPLETE)
- BCC-005: Fix right column container (COMPLETE)
- BCC-002: Free positioning enhancement (IN PROGRESS)
- BCC-003: Automated testing (TODO)

### External Resources
- HTML5 Drag & Drop API: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
- Svelte Documentation: https://svelte.dev/docs
- GitHub Copilot Docs: https://docs.github.com/en/copilot

## Questions or Issues?

If you encounter issues:

1. Check the evaluation document: `PATH-B-EVALUATION.md`
2. Review the implementation plan: `PLAN-V2-FREE-POSITIONING.md`
3. Check git log for recent changes: `git log --oneline`
4. Ask GitHub Copilot Chat: `@workspace What does [component] do?`

## Success Criteria

Your work is complete when:
- ✅ Free positioning mode activates when flag is set
- ✅ All 9 cards are individually draggable
- ✅ Cards can be positioned anywhere on screen
- ✅ Positions persist after page reload
- ✅ Grid snapping works (10px increments)
- ✅ Collision detection shows red outline
- ✅ No TypeScript errors
- ✅ All tests pass
- ✅ Screenshots document the feature

---

**Good luck with your local development! The foundation is solid - you're just a few hours away from a fully working free positioning system.** 🚀
