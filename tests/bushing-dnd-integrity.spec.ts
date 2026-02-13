import { test, expect } from '@playwright/test';

test.describe('Bushing Card Drag-and-Drop Integrity', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto('http://127.0.0.1:5173/#/bushing');
    await page.waitForLoadState('networkidle');
  });

  test('should not have duplicate keys in card layout', async ({ page }) => {
    // Wait for cards to render
    await page.waitForSelector('[data-testid="bushing-card"]', { timeout: 10000 }).catch(() => {
      // If no test IDs, wait for card content
      return page.waitForSelector('.bushing-pop-card', { timeout: 10000 });
    });

    // Check localStorage for duplicate keys
    const layout = await page.evaluate(() => {
      const stored = localStorage.getItem('scd.bushing.layout.v3');
      return stored ? JSON.parse(stored) : null;
    });

    if (layout) {
      const leftCards = layout.leftCardOrder || [];
      const rightCards = layout.rightCardOrder || [];
      
      // Check for duplicates in left
      const leftSet = new Set(leftCards);
      expect(leftCards.length).toBe(leftSet.size);
      
      // Check for duplicates in right
      const rightSet = new Set(rightCards);
      expect(rightCards.length).toBe(rightSet.size);
    }
  });

  test('should handle corrupted localStorage gracefully', async ({ page }) => {
    // Inject corrupted data
    await page.evaluate(() => {
      localStorage.setItem('scd.bushing.layout.v3', JSON.stringify({
        leftCardOrder: ['header', 'guidance', 'setup', 'setup'], // Duplicate!
        rightCardOrder: ['drafting', 'summary', 'diagnostics']
      }));
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should fall back to defaults and clear corrupted data
    const layout = await page.evaluate(() => {
      const stored = localStorage.getItem('scd.bushing.layout.v3');
      return stored ? JSON.parse(stored) : null;
    });

    // Should be fixed or reset to defaults
    if (layout) {
      const leftCards = layout.leftCardOrder || [];
      const leftSet = new Set(leftCards);
      expect(leftCards.length).toBe(leftSet.size);
    }
  });

  test('should support native HTML5 drag-and-drop', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for cards with draggable attribute
    await page.waitForSelector('[draggable="true"]', { timeout: 10000 });

    // Get all draggable elements
    const draggables = await page.$$('[draggable="true"]');
    expect(draggables.length).toBeGreaterThan(0);

    // Test native drag-and-drop
    if (draggables.length >= 2) {
      const firstCard = draggables[0];
      const secondCard = draggables[1];
      
      const firstBbox = await firstCard.boundingBox();
      const secondBbox = await secondCard.boundingBox();
      
      if (firstBbox && secondBbox) {
        // Perform native HTML5 drag
        await page.mouse.move(firstBbox.x + firstBbox.width / 2, firstBbox.y + 20);
        await page.mouse.down();
        await page.mouse.move(secondBbox.x + secondBbox.width / 2, secondBbox.y + 20, { steps: 10 });
        await page.mouse.up();
        
        // Wait for any async updates
        await page.waitForTimeout(500);
      }
    }

    // Should not have thrown any drag-related errors
    const dragErrors = errors.filter(err => 
      err.includes('originalDragTarget') ||
      err.includes('svelte-dnd-action') ||
      err.includes('dndzone') ||
      err.includes('getBoundingClientRect')
    );

    expect(dragErrors).toHaveLength(0);
  });

  test('should persist layout changes', async ({ page }) => {
    await page.waitForSelector('.bushing-pop-card', { timeout: 10000 });

    // Get initial layout
    const initialLayout = await page.evaluate(() => {
      const stored = localStorage.getItem('scd.bushing.layout.v3');
      return stored ? JSON.parse(stored) : null;
    });

    expect(initialLayout).toBeTruthy();
    
    // Verify structure
    if (initialLayout) {
      expect(initialLayout).toHaveProperty('leftCardOrder');
      expect(initialLayout).toHaveProperty('rightCardOrder');
      expect(Array.isArray(initialLayout.leftCardOrder)).toBe(true);
      expect(Array.isArray(initialLayout.rightCardOrder)).toBe(true);
    }
  });

  test('keyboard navigation should work with native DnD', async ({ page }) => {
    await page.waitForSelector('[draggable="true"]', { timeout: 10000 });

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Get first draggable item
    const draggables = await page.$$('[draggable="true"]');
    if (draggables.length > 0) {
      const firstItem = draggables[0];
      
      // Focus the item
      await firstItem.focus();
      
      // Test keyboard navigation (Space to grab, Arrow to move, Enter to drop)
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // No errors should occur
    expect(errors).toHaveLength(0);
  });

  test('should not have Svelte warnings for unused exports', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.goto('http://127.0.0.1:5173/#/bushing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for the specific warning we fixed
    const exportWarnings = warnings.filter(w => 
      w.includes('export_let_unused') ||
      w.includes('BushingFreePositionContainer')
    );

    expect(exportWarnings).toHaveLength(0);
  });
});
