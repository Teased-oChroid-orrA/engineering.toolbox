import { expect, test } from '@playwright/test';

async function openBushing(page: import('@playwright/test').Page) {
  await page.goto('/#/bushing');
  await expect(page.getByRole('heading', { name: 'Bushing Toolbox' })).toBeVisible();
}

test.describe('bushing guided workflow UI', () => {
  test('shows guided-first cards and hides advanced drafting diagnostics by default', async ({ page }) => {
    await openBushing(page);

    await expect(page.getByRole('button', { name: 'Guided' }).first()).toBeVisible();
    await expect(page.locator('#bushing-geometry-card')).toContainText('Fit Intent Summary');
    await expect(page.getByText('Decision Summary')).toBeVisible();
    await expect(page.getByText('Diagnostic Ladder')).toBeVisible();
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
