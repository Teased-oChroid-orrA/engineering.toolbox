import { expect, test } from '@playwright/test';

const SHOT_DIR = '/Users/nautilus/Desktop/engineering.toolbox/implementation/screenshots';

test.describe('bushing viewport screenshot captures', () => {
  test('captures straight, flanged, and countersink viewport states', async ({ page }) => {
    await page.goto('/#/bushing');
    await expect(page.getByRole('heading', { name: 'Bushing Toolbox' })).toBeVisible();

    const viewport = page.locator('svg[viewBox="0 0 660 660"]').first();
    await expect(viewport).toContainText('Housing section');
    await expect(viewport).toContainText('Top View');

    await viewport.screenshot({ path: `${SHOT_DIR}/bushing-viewport-straight.png` });

    await page.getByRole('button', { name: 'Flanged' }).first().click();
    await expect(viewport).toContainText('Flange thk');
    await viewport.screenshot({ path: `${SHOT_DIR}/bushing-viewport-flanged.png` });

    await page.getByRole('button', { name: "C'Sink" }).first().click();
    await expect(viewport).toContainText('Ext CS depth');
    await viewport.screenshot({ path: `${SHOT_DIR}/bushing-viewport-csink.png` });
  });
});
