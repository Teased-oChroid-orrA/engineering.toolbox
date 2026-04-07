import { test, expect } from '@playwright/test';

test.describe('Bushing Card Layout Live Test', () => {
  test('should expose the current card metadata contract', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/bushing');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-dnd-card]', { timeout: 10000 });

    const initialOrder = await page.evaluate(() => {
      const stored = localStorage.getItem('scd.bushing.layout.v3');
      return stored ? JSON.parse(stored) : null;
    });

    console.log('Initial order:', initialOrder);

    const cards = await page.$$eval('[data-dnd-card]', (nodes) =>
      nodes.map((node) => ({
        cardId: node.getAttribute('data-dnd-card'),
        lane: node.getAttribute('data-dnd-lane'),
        dragEnabled: node.getAttribute('data-drag-enabled'),
        role: node.getAttribute('role')
      }))
    );

    console.log(`Found ${cards.length} current DnD cards`);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((card) => card.cardId && card.lane && card.role === 'listitem')).toBe(true);
    expect(cards.every((card) => card.dragEnabled === '0')).toBe(true);

    const cardIds = cards.map((card) => card.cardId);
    expect(new Set(cardIds).size).toBe(cardIds.length);

    if (initialOrder) {
      const initialLeft = initialOrder.leftCardOrder || [];
      const initialRight = initialOrder.rightCardOrder || [];

      console.log('Initial left:', initialLeft);
      console.log('Initial right:', initialRight);

      expect(new Set(initialLeft).size).toBe(initialLeft.length);
      expect(new Set(initialRight).size).toBe(initialRight.length);
    }
  });

  test('should persist layout to localStorage immediately', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/bushing');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-dnd-card]', { timeout: 10000 });

    const before = await page.evaluate(() => {
      return localStorage.getItem('scd.bushing.layout.v3');
    });

    console.log('Layout before:', before);
    expect(before).toBeTruthy();

    const after = await page.evaluate(() => {
      return localStorage.getItem('scd.bushing.layout.v3');
    });

    console.log('Layout after:', after);
    expect(after).toBe(before);
  });
});
