import { test } from '@playwright/test';

test('screenshot inspector toolbox', async ({ page }) => {
  await page.goto('/#/inspector');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'artifacts/inspector-tests/inspector-overview.png', fullPage: true });
});

test('screenshot bushing toolbox', async ({ page }) => {
  await page.goto('/#/bushing');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'artifacts/inspector-tests/bushing-overview.png', fullPage: true });
});
