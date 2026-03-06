import { expect, test } from '@playwright/test';

test.describe('startup reliability', () => {
  test('splash hands off only when app shell and route markers are present', async ({ page }) => {
    await page.goto('/');

    const splash = page.locator('#splash');
    await expect(splash).toBeVisible();

    await expect(page.locator('[data-main-nav-root]').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('[data-route-ready="dashboard"]').first()).toBeVisible({ timeout: 25_000 });

    await expect(splash).toHaveCount(0, { timeout: 25_000 });

    await expect(page.locator('#app-content-root')).toBeVisible();
  });
});
