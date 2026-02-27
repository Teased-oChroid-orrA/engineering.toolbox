import { expect, test } from '@playwright/test';
import path from 'node:path';

test.describe('fastener single preload visual', () => {
  test('renders hash route and captures non-empty screenshots', async ({ page }) => {
    const origin = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '5173'}`;
    await page.goto(`${origin}/#/fastener`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Single Fastener Preload Analysis')).toBeVisible();
    await expect(page.locator('svg')).toBeVisible();

    const outDir = path.resolve('.artifacts');
    await page.screenshot({ path: path.join(outDir, 'fastener-single-preload-overview.png'), fullPage: true });

    await page.getByRole('button', { name: 'Hide Setup' }).click();
    await expect(page.getByRole('button', { name: 'Edit Setup' })).toBeVisible();
    await page.screenshot({ path: path.join(outDir, 'fastener-single-preload-results-focus.png'), fullPage: true });

    await page.getByRole('button', { name: 'Edit Setup' }).click();
    await page.getByRole('button', { name: 'Torque' }).click();
    await expect(page.getByText('Bearing mean diameter')).toBeVisible();
    await page.screenshot({ path: path.join(outDir, 'fastener-single-preload-torque.png'), fullPage: true });
  });
});
