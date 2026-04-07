import { expect, test } from '@playwright/test';

async function goToPreloadReview(page: import('@playwright/test').Page) {
  await page.locator('button', { hasText: '4. Review' }).first().click();
}

async function goToPreloadGeometry(page: import('@playwright/test').Page) {
  await page.locator('button', { hasText: '3. Define Geometry' }).first().click();
}

test('preload route renders solver outputs and report action', async ({ page }) => {
  await page.goto('/#/preload');
  await expect(page.locator('#app-content-root[data-route-ready="preload"]')).toBeVisible();
  await expect(page.locator('button', { hasText: '1. Pick Fastener' }).first()).toBeVisible();
  await goToPreloadReview(page);
  await expect(page.getByText('Joint Section Model')).toBeVisible();
  await expect(page.getByText('Preload Chart / Reserve Envelope')).toBeVisible();
  await expect(page.getByLabel('Preload summary panel')).toBeVisible();
  await expect(page.getByLabel('Preload joint section panel')).toBeVisible();
  await expect(page.getByText('Computed State')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Joint Section SVG' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Summary SVG' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export PDF Equation Sheet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Audit CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Audit JSON' })).toBeVisible();
  await expect(page.getByText('Reserve Envelopes (min / nominal / max)')).toBeVisible();
  await page.getByRole('button', { name: 'Show Advanced' }).click();
  await expect(page.getByText('Adjacent Fastener Screening')).toBeVisible();
  await expect(page.getByText('Load cases')).toBeVisible();
  await expect(page.getByLabel('Preload bolt pattern map')).toBeVisible();
  await expect(page.getByLabel('Preload load-transfer progression')).toBeVisible();
  await expect(page.getByLabel('Preload fastener-group case envelopes')).toBeVisible();
  await expect(page.getByLabel('Preload geometry influence matrix heatmap')).toBeVisible();
  await expect(page.getByText('Import provenance')).toBeVisible();
  await expect(page.getByText('TRS / Monogram Aerospace')).toBeVisible();
  await expect(page.getByText('Thermal compare pack')).toBeVisible();
  await expect(page.getByText('Friction compare pack')).toBeVisible();
  await expect(page.getByText('Loss compare pack')).toBeVisible();

  await goToPreloadGeometry(page);
  await expect(page.getByText('Physical layers remain rectangular plates.')).toBeVisible();
  await expect(page.getByText('Use custom plate layers')).toBeVisible();
  await expect(page.getByText('Two plate rows are generated automatically from the main geometry inputs.')).toBeVisible();

  await page.locator('button', { hasText: '1. Pick Fastener' }).first().click();
  await expect(page.getByText('Use custom bolt segmentation')).toBeVisible();
  await expect(page.getByText('The selected catalog fastener automatically defines a smooth grip segment')).toBeVisible();
});

test('wizard can advance beyond step 1 with default valid fastener inputs', async ({ page }) => {
  await page.goto('/#/preload');
  await expect(page.getByText('Step 1 · Pick Fastener')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).first().click();
  await expect(page.getByText('Step 2 · Pick Materials')).toBeVisible();
});

test('changing the compression proxy keeps solver outputs visible', async ({ page }) => {
  await page.goto('/#/preload');
  await goToPreloadGeometry(page);
  const plateLayersCard = page.getByText('Clamped Plate Layers').locator('..').locator('..');
  const memberSelect = plateLayersCard.locator('select').last();
  await memberSelect.selectOption('conical_frustum_annulus');
  await goToPreloadReview(page);
  await expect(page.getByLabel('Preload summary panel')).toBeVisible();
  await expect(page.getByText('Unsupported area model')).toHaveCount(0);
});

test('preload summary SVG export uses the live summary panel', async ({ page }) => {
  await page.goto('/#/preload');
  await goToPreloadReview(page);
  await expect(page.getByLabel('Preload summary panel')).toBeVisible();
  await page.getByRole('button', { name: 'Export Summary SVG' }).click();
  await page.waitForTimeout(250);
  await expect(page.getByText('Preload SVG export failed.')).toHaveCount(0);
});

test('preload CSV and JSON exports complete without surfacing export errors', async ({ page }) => {
  await page.goto('/#/preload');
  await goToPreloadReview(page);
  await expect(page.getByLabel('Preload summary panel')).toBeVisible();

  await page.getByRole('button', { name: 'Export Audit CSV' }).click();
  await page.waitForTimeout(200);
  await expect(page.getByText('Preload CSV export failed.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Export Audit JSON' }).click();
  await page.waitForTimeout(200);
  await expect(page.getByText('Preload JSON export failed.')).toHaveCount(0);
});

test('preload joint-section SVG export uses the live joint section panel', async ({ page }) => {
  await page.goto('/#/preload');
  await goToPreloadReview(page);
  await expect(page.getByLabel('Preload joint section panel')).toBeVisible();
  await page.getByRole('button', { name: 'Export Joint Section SVG' }).click();
  await page.waitForTimeout(250);
  await expect(page.getByText('Preload joint-section SVG export failed.')).toHaveCount(0);
});
