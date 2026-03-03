import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('implementation/screenshots');
const OFFSET_PREVIEW_PATH = path.join(SCREENSHOT_DIR, 'surface-offset-preview.png');
const OFFSET_INTERSECTION_PATH = path.join(SCREENSHOT_DIR, 'surface-offset-intersection.png');

async function openSurface(page: import('@playwright/test').Page) {
  await page.goto('/#/surface');
  await expect(page.locator('#app-content-root[data-route-ready="surface"]')).toBeVisible();
  const promptBtn = page.getByRole('button', { name: 'Use Core Mode (Recommended)' });
  await promptBtn.click({ timeout: 2000 }).catch(() => {});
  await page.locator('.fixed.inset-0.z-\\[360\\]').waitFor({ state: 'hidden', timeout: 2500 }).catch(() => {});
  await expect(page.getByLabel('Surface viewport container')).toBeVisible();
}

test('captures offset workflow screenshots', async ({ page }) => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await openSurface(page);

  await page.getByRole('button', { name: 'Viewport tab Offset' }).click();
  await page.getByRole('button', { name: 'Start Offset Builder' }).click();

  await page.getByRole('button', { name: 'Select line L1', exact: true }).click({ force: true });
  await page.getByRole('button', { name: 'Select surface S1', exact: true }).click({ force: true });
  await page.getByRole('button', { name: 'Select line L4', exact: true }).click({ force: true });
  await page.getByRole('button', { name: 'Select surface S1', exact: true }).click({ force: true });

  await expect(page.getByText(/Crossing ready/i).first()).toBeVisible();
  await expect(page.getByText('P = (2.500, 5.000, 0.000)')).toBeVisible();
  await page.getByLabel('Surface viewport container').screenshot({ path: OFFSET_PREVIEW_PATH });

  const initialPointCount = await page.locator('[aria-label^="Select point P"]').count();
  const placeCrossingButton = page.getByRole('button', { name: 'Offset wizard place crossing' });
  await expect(placeCrossingButton).toBeEnabled();
  await placeCrossingButton.click();
  await expect(page.locator('[aria-label^="Select point P"]')).toHaveCount(initialPointCount + 1);
  await page.getByLabel('Surface viewport container').screenshot({ path: OFFSET_INTERSECTION_PATH });
});
