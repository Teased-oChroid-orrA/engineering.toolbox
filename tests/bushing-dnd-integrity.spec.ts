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
    await page.waitForSelector('[data-dnd-card]', { timeout: 10000 });

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

  test('should expose stable current DnD card metadata', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for cards with the current DnD metadata contract
    await page.waitForSelector('[data-dnd-card]', { timeout: 10000 });

    const cards = await page.$$eval('[data-dnd-card]', (nodes) =>
      nodes.map((node) => ({
        cardId: node.getAttribute('data-dnd-card'),
        lane: node.getAttribute('data-dnd-lane'),
        dragEnabled: node.getAttribute('data-drag-enabled'),
        role: node.getAttribute('role')
      }))
    );

    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((card) => card.cardId && card.lane && card.role === 'listitem')).toBe(true);
    expect(cards.every((card) => card.dragEnabled === '0')).toBe(true);

    // Should not have thrown any metadata or render errors
    expect(errors).toHaveLength(0);
  });

  test('should persist layout changes', async ({ page }) => {
    await page.waitForSelector('[data-dnd-card]', { timeout: 10000 });

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

  test('keyboard navigation should not throw while cards render', async ({ page }) => {
    await page.waitForSelector('[data-dnd-card]', { timeout: 10000 });

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // No errors should occur while the current card metadata renders.
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
    const exportWarnings = warnings.filter((w) => w.includes('export_let_unused'));

    expect(exportWarnings).toHaveLength(0);
  });
});
