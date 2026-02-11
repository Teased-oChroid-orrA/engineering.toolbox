import { expect, test } from '@playwright/test';

test.describe('Inspector scroll smoothness contract', () => {
  test('rapid downward scroll keeps grid interactive', async ({ page }) => {
    await page.goto('/#/inspector');

    const grid = page.getByRole('grid', { name: 'Inspector grid' });
    await expect(grid).toBeVisible();

    for (let i = 0; i < 16; i++) {
      await grid.hover();
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(22);
    }
    await page.waitForTimeout(120);
    await expect(grid).toBeVisible();
  });
});
