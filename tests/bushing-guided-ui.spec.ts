import { expect, test } from '@playwright/test';

async function openBushing(page: import('@playwright/test').Page) {
  await page.goto('/#/bushing');
  await expect(page.getByRole('heading', { name: 'Bushing Toolbox' })).toBeVisible();
}

test.describe('bushing guided workflow UI', () => {
  test('shows guided-first cards and hides advanced drafting diagnostics by default', async ({ page }) => {
    await openBushing(page);

    await expect(page.getByRole('button', { name: 'Guided' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quick Solve' })).toBeVisible();
    await expect(page.locator('#bushing-geometry-card')).toContainText('Fit Intent Summary');
    await expect(page.getByText('Governing Case')).toBeVisible();
    await expect(page.getByText('Live Delta Strip')).toBeVisible();
    await expect(page.getByText('Diagnostic Ladder')).toHaveCount(0);
    await expect(page.getByText('Trace: Off')).toHaveCount(0);
  });

  test('restores advanced mode and shows advanced drafting controls', async ({ page }) => {
    await openBushing(page);

    await page.getByRole('button', { name: 'Advanced' }).first().click();
    await expect(page.getByText('Trace: Off')).toBeVisible();

    await page.reload();
    await openBushing(page);
    await expect(page.getByText('Trace: Off')).toBeVisible();
  });

  test('supports reamer selection and scenario compare workflow', async ({ page }) => {
    await openBushing(page);
    await page.getByTestId('bushing-bore-reamer-open').click();
    await page.getByTestId('bushing-reamer-option-builtin-3-16-0-1875').click();
    await expect(page.getByTestId('bushing-compare-summary')).toContainText('Bore reamer: 3/16');

    await page.getByTestId('bushing-id-reamer-open').click();
    await page.getByTestId('bushing-reamer-option-builtin-1-4-0-2500').click();
    await expect(page.getByTestId('bushing-compare-summary')).toContainText('ID reamer: 1/4');

    await page.getByRole('button', { name: 'Advanced' }).first().click();
    await page.getByTestId('bushing-scenario-name').fill('Hot fit');
    await page.getByTestId('bushing-save-scenario').click();
    await page.getByRole('button', { name: 'Compare Hot fit' }).click();
    await expect(page.getByTestId('bushing-compare-summary')).toContainText('Hot fit');
  });

  test('shows first-class service and approval workflow controls', async ({ page }) => {
    await openBushing(page);
    await page.getByRole('button', { name: 'Engineering Review' }).click();

    await expect(page.getByText('Primary Process Route')).toBeVisible();
    await expect(page.locator('#bushing-process-card').getByText('Service Envelope', { exact: true })).toBeVisible();
    await expect(page.locator('#bushing-process-card').getByText('Duty Screen', { exact: true })).toBeVisible();
    await expect(page.getByText('Approval Basis')).toBeVisible();

    await page.getByPlaceholder('e.g. local route or traveler ref').fill('Traveler 42A');

    await expect(page.getByText('Process + Approval')).toBeVisible();
    await expect(page.getByText('Traveler 42A', { exact: true })).toBeVisible();
  });

  test('adds a custom reamer into the catalog and removes it from the custom section', async ({ page }) => {
    await openBushing(page);

    await page.getByTestId('bushing-bore-reamer-open').click();
    await page.getByTestId('bushing-reamer-picker-custom-tab').click();
    await page.getByPlaceholder('Custom BORE tooling').fill('Test Custom');
    await page.locator("[data-testid='bushing-reamer-picker'] input[type='number']").nth(0).fill('0.4234');
    await page.locator("[data-testid='bushing-reamer-picker'] input[type='number']").nth(1).fill('0.0002');
    await page.locator("[data-testid='bushing-reamer-picker'] input[type='number']").nth(2).fill('0.0000');
    await page.getByTestId('bushing-reamer-picker-apply-custom').click();
    await expect(page.getByTestId('bushing-compare-summary')).toContainText('Bore reamer: Test Custom');

    await page.getByTestId('bushing-bore-reamer-open').click();
    await page.getByText('Special / Custom Catalog').waitFor();
    const customCard = page.getByTestId('bushing-reamer-option-custom-test-custom-0-4234');
    await expect(customCard).toBeVisible();
    await customCard.hover();
    await page.getByTestId('bushing-reamer-delete-custom-test-custom-0-4234').click();
    await expect(customCard).toHaveCount(0);
  });

  test('recovers from malformed unified workspace state', async ({ page }) => {
    await page.goto('/#/bushing');
    await page.evaluate(() => {
      localStorage.setItem('scd.bushing.workspace.v1', JSON.stringify({
        ui: { uxMode: 'guided', useFreePositioning: false },
        layout: {
          leftCardOrder: ['header', 'header'],
          rightCardOrder: ['drafting', 'summary', 'diagnostics']
        },
        diagnosticsOrder: ['edge'],
        dndEnabled: true,
        runtime: { useLegacyRenderer: false, traceEnabled: false }
      }));
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bushing Toolbox' })).toBeVisible();
    await expect(page.locator("[data-dnd-lane='left'][data-dnd-card='guidance']")).toBeVisible();
  });
});
