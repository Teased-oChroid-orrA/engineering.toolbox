import { expect, test } from '@playwright/test';

test.describe('bushing e2e smoke UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/bushing');
    await expect(page.getByText('Bushing Toolbox')).toBeVisible();
  });

  test('loads drafting/export shell and toggles render mode', async ({ page }) => {
    await expect(page.getByText('5. Drafting / Export')).toBeVisible();
    const toggle = page.getByRole('button', { name: /Draft Renderer:/ });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toContainText(/Draft Renderer:/);
    await expect(page.getByRole('button', { name: 'Export SVG' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
  });

  test('switches profile type and keeps results visible', async ({ page }) => {
    await page.getByRole('button', { name: 'Flanged' }).first().click();
    await expect(page.getByText('Results Summary')).toBeVisible();
    await expect(page.getByText('Safety Margins (Yield)')).toBeVisible();
    await expect(page.getByText('Fit Physics')).toBeVisible();
  });
});

