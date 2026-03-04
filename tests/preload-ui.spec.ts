import { expect, test } from '@playwright/test';

test('preload route renders solver outputs and report action', async ({ page }) => {
  await page.goto('/#/preload');
  await expect(page.locator('#app-content-root[data-route-ready="preload"]')).toBeVisible();
  await expect(page.getByText('Fastened Joint Preload Analysis')).toBeVisible();
  await expect(page.getByText('Joint Section Model')).toBeVisible();
  await expect(page.getByText('Preload Chart / Reserve Envelope')).toBeVisible();
  await expect(page.getByLabel('Preload summary panel')).toBeVisible();
  await expect(page.getByLabel('Preload joint section panel')).toBeVisible();
  await expect(page.getByText('Computed State')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Bolt Segment' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Plate Layer (Tapered Proxy)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duplicate bolt segment' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duplicate member segment' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Joint Section SVG' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Summary SVG' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export PDF Equation Sheet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Audit CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Audit JSON' })).toBeVisible();
  await expect(page.getByText('Reserve Envelopes (min / nominal / max)')).toBeVisible();
  await expect(page.getByText('Adjacent Fastener Screening')).toBeVisible();
  await expect(page.getByText('Load cases')).toBeVisible();
  await expect(page.getByLabel('Preload bolt pattern map')).toBeVisible();
  await expect(page.getByLabel('Preload fastener-group case envelopes')).toBeVisible();
  await expect(page.getByLabel('Preload geometry influence matrix heatmap')).toBeVisible();
  await expect(page.getByText('Physical layers remain plates.')).toBeVisible();
  await expect(page.getByText('Imported catalog adapters')).toBeVisible();
  await expect(page.getByText('TRS / Monogram Aerospace')).toBeVisible();
});

test('changing the compression proxy keeps solver outputs visible', async ({ page }) => {
  await page.goto('/#/preload');
  const memberSelect = page.getByText('Clamped Plate Layers').locator('..').locator('..').locator('select').first();
  await memberSelect.selectOption('conical_frustum_annulus');
  await expect(page.getByLabel('Preload summary panel')).toBeVisible();
  await expect(page.getByText('Unsupported area model')).toHaveCount(0);
});

test('preload summary SVG export uses the live summary panel', async ({ page }) => {
  await page.goto('/#/preload');
  await expect(page.getByLabel('Preload summary panel')).toBeVisible();
  await page.getByRole('button', { name: 'Export Summary SVG' }).click();
  await page.waitForTimeout(250);
  await expect(page.getByText('Preload SVG export failed.')).toHaveCount(0);
});

test('preload CSV and JSON exports complete without surfacing export errors', async ({ page }) => {
  await page.goto('/#/preload');
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
  await expect(page.getByLabel('Preload joint section panel')).toBeVisible();
  await page.getByRole('button', { name: 'Export Joint Section SVG' }).click();
  await page.waitForTimeout(250);
  await expect(page.getByText('Preload joint-section SVG export failed.')).toHaveCount(0);
});
