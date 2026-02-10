import { test, expect } from '@playwright/test';

test.describe('Surface toolbox smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/surface');
    const promptBtn = page.getByRole('button', { name: 'Use Core Mode (Recommended)' });
    if (await promptBtn.isVisible().catch(() => false)) {
      await promptBtn.click();
    }
  });

  test('loads surface toolbox core shell', async ({ page }) => {
    await expect(page.getByText('3D Surface Evaluation & Lofting')).toBeVisible();
    await expect(page.getByText('Status Rail')).toBeVisible();
    await expect(page.getByText('Datum Slicing + Export')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compute slices' })).toBeVisible();
  });

  test('shows guided microcopy and recommendation rail', async ({ page }) => {
    await expect(page.getByText('Recommended workflow:')).toBeVisible();
    await expect(page.getByText('Recommendation Rail')).toBeVisible();
  });

  test('shows mode control and core policy messaging', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Core', exact: true })).toBeVisible();
    await expect(page.getByText('Core Mode is active.')).toBeVisible();
  });
});
