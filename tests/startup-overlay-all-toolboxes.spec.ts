import { expect, test } from '@playwright/test';

const cases = [
  { hash: '#/', marker: '[data-route-ready="dashboard"]' },
  { hash: '#/bushing', marker: '[data-route-ready="bushing"]' },
  { hash: '#/shear', marker: '[data-route-ready="shear"]' },
  { hash: '#/profile', marker: '[data-route-ready="profile"]' },
  { hash: '#/properties', marker: '[data-route-ready="properties"]' },
  { hash: '#/buckling', marker: '[data-route-ready="buckling"]' },
  { hash: '#/weight-balance', marker: '[data-route-ready="weight-balance"]' },
  { hash: '#/inspector', marker: '[data-route-ready="inspector"]' },
  { hash: '#/surface', marker: '[data-route-ready="surface"]' }
] as const;

for (const tc of cases) {
  test(`startup overlay handoff is clean for ${tc.hash}`, async ({ page }) => {
    test.setTimeout(360_000);

    await page.goto(`/${tc.hash}`);

    const splash = page.locator('#splash');
    await expect(splash).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#splash-fill')).toBeVisible();

    await expect(page.locator(tc.marker).first()).toBeAttached({ timeout: 300_000 });
    await expect(splash).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator(tc.marker).first()).toBeAttached();
  });
}
