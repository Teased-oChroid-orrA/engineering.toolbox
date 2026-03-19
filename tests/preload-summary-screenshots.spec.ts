import { expect, test } from '@playwright/test';

async function goToPreloadReview(page: import('@playwright/test').Page) {
  await page.locator('button', { hasText: '4. Review' }).first().click();
  if ((await page.getByLabel('Preload summary panel').count()) === 0) {
    for (let i = 0; i < 3; i += 1) {
      const next = page.getByRole('button', { name: 'Next' }).first();
      if (await next.isVisible()) await next.click();
    }
    await page.locator('button', { hasText: '4. Review' }).first().click();
  }
}

async function preparePreloadScreenshot(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('scd.preload.inputs.v2');
    localStorage.removeItem('scd.preload.inputs.v1');
    localStorage.removeItem('scd.preload.step-snapshots.v1');
    localStorage.removeItem('scd.preload.step-hints.v1');
    localStorage.removeItem('scd.preload.step-telemetry.v1');
    localStorage.removeItem('scd.preload.step-prefs.v1');
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

async function capturePanel(
  page: import('@playwright/test').Page,
  locator: import('@playwright/test').Locator,
  path: string
) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const box = await locator.boundingBox();
  if (!box) throw new Error('Panel bounding box unavailable.');
  const viewport = page.viewportSize();
  const maxWidth = viewport?.width ?? 1280;
  const maxHeight = viewport?.height ?? 720;
  const x = Math.max(0, Math.min(box.x, maxWidth - 1));
  const y = Math.max(0, Math.min(box.y, maxHeight - 1));
  const width = Math.max(1, Math.min(box.width, maxWidth - x));
  const height = Math.max(1, Math.min(box.height, maxHeight - y));
  await page.screenshot({
    path,
    clip: {
      x,
      y,
      width,
      height
    }
  });
}

test('captures preload summary visualization panel', async ({ page }) => {
  await preparePreloadScreenshot(page);
  await goToPreloadReview(page);
  const panel = page.getByLabel('Preload summary panel');
  await capturePanel(page, panel, '/Users/nautilus/Desktop/engineering.toolbox/implementation/screenshots/preload-summary-panel.png');
});

test('captures preload joint section visualization panel', async ({ page }) => {
  await preparePreloadScreenshot(page);
  await goToPreloadReview(page);
  const panel = page.getByLabel('Preload joint section panel');
  await capturePanel(page, panel, '/Users/nautilus/Desktop/engineering.toolbox/implementation/screenshots/preload-joint-section-panel.png');
});

test('captures preload influence matrix heatmap panel', async ({ page }) => {
  await preparePreloadScreenshot(page);
  await goToPreloadReview(page);
  await page.getByRole('button', { name: 'Show Advanced' }).click();
  const panel = page.getByLabel('Preload geometry influence matrix heatmap');
  await capturePanel(page, panel, '/Users/nautilus/Desktop/engineering.toolbox/implementation/screenshots/preload-influence-matrix-heatmap.png');
});
