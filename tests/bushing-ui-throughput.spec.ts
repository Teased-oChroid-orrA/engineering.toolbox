import { expect, test } from '@playwright/test';

test.describe('bushing UI throughput', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/bushing');
    await expect(page.getByText('Bushing Toolbox')).toBeVisible();
  });

  test('summary responds to numeric edits without blur', async ({ page }) => {
    const interferenceInput = page.locator('label:has-text("Interference")').first().locator('xpath=following::input[1]');
    await expect(interferenceInput).toBeVisible();

    const summaryValue = page.getByText('Interference (eff.)').locator('..').locator('span').last();
    const before = (await summaryValue.textContent())?.trim() ?? '';

    await interferenceInput.fill('0.0023');
    await expect(summaryValue).not.toHaveText(before);
  });
});
