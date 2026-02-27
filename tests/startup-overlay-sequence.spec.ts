import { expect, test } from '@playwright/test';

test('startup overlay sequence has no blank handoff', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('/#/');

  const splash = page.locator('#splash');
  await expect(splash).toBeVisible({ timeout: 2000 });
  await expect(page.locator('#splash-fill')).toBeVisible();
  await expect(page.locator('#splash-percent')).toContainText('%');

  // Ensure splash remains present until dashboard content exists.
  await expect(page.locator('h1', { hasText: 'Welcome Back, Engineer.' })).toBeVisible({ timeout: 120000 });

  // Splash should dismiss shortly after dashboard ready.
  await expect(splash).toHaveCount(0, { timeout: 6000 });

  // Ensure route content is still visible after splash removal.
  await expect(page.locator('h1', { hasText: 'Welcome Back, Engineer.' })).toBeVisible();
});
