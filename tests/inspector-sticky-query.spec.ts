import { expect, test } from '@playwright/test';

test.describe('Inspector sticky query bar', () => {
  test('query controls remain pinned while inspector body scrolls', async ({ page }) => {
    await page.goto('/#/inspector');

    const queryCard = page.locator('[data-testid="inspector-query-row"]');
    await expect(queryCard).toBeVisible();
    const before = await queryCard.boundingBox();
    expect(before).not.toBeNull();

    const grid = page.getByRole('grid', { name: 'Inspector grid' });
    await expect(grid).toBeVisible();
    await grid.evaluate((el: HTMLElement) => {
      el.scrollTop = 1200;
      el.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await page.waitForTimeout(80);

    const after = await queryCard.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(8);
  });
});
