import { expect, test } from '@playwright/test';

const SHOT_DIR = '/Users/nautilus/Desktop/engineering.toolbox/implementation/screenshots';

async function captureViewport(page: import('@playwright/test').Page, viewport: import('@playwright/test').Locator, path: string) {
  await expect(viewport).toBeVisible();
  await page.waitForTimeout(150);
  const box = await viewport.boundingBox();
  if (!box) throw new Error('Viewport bounding box unavailable for screenshot capture.');
  await page.screenshot({
    path,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.max(1, box.width),
      height: Math.max(1, box.height)
    }
  });
}

test.describe('bushing viewport screenshot captures', () => {
  test('captures straight, flanged, and countersink viewport states', async ({ page }) => {
    await page.goto('/#/bushing');
    await expect(page.getByRole('heading', { name: 'Bushing Toolbox' })).toBeVisible();

    const viewport = page.locator('svg[viewBox="0 0 660 660"]').first();
    await expect(viewport).toContainText('Housing section');
    await expect(viewport).toContainText('Top View');

    await captureViewport(page, viewport, `${SHOT_DIR}/bushing-viewport-straight.png`);

    await page.getByRole('button', { name: 'Flanged' }).first().click();
    await expect(viewport).toContainText('Flange thk');
    await captureViewport(page, viewport, `${SHOT_DIR}/bushing-viewport-flanged.png`);

    await page.getByRole('button', { name: "C'Sink" }).first().click();
    await expect(viewport).toContainText('Ext CS depth');
    await captureViewport(page, viewport, `${SHOT_DIR}/bushing-viewport-csink.png`);
  });
});
