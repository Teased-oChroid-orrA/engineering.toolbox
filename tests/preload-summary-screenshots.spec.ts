import { expect, test } from '@playwright/test';

async function preparePreloadScreenshot(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('scd.preload.inputs.v1');
  });
  await page.goto('/#/preload');
  await page.waitForSelector('[data-route-ready="preload"]');
  await page.addStyleTag({
    content: `
      .fixed { display: none !important; }
      [class*="fixed"] { display: none !important; }
    `
  });
}

test('captures preload summary visualization panel', async ({ page }) => {
  await preparePreloadScreenshot(page);
  const panel = page.getByLabel('Preload summary panel');
  await expect(panel).toBeVisible();
  await panel.screenshot({
    path: '/Users/nautilus/Desktop/engineering.toolbox/implementation/screenshots/preload-summary-panel.png'
  });
});

test('captures preload joint section visualization panel', async ({ page }) => {
  await preparePreloadScreenshot(page);
  const panel = page.getByLabel('Preload joint section panel');
  await expect(panel).toBeVisible();
  await panel.screenshot({
    path: '/Users/nautilus/Desktop/engineering.toolbox/implementation/screenshots/preload-joint-section-panel.png'
  });
});
