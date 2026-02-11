import { expect, test } from '@playwright/test';

test.describe('Inspector overlay visibility', () => {
  test('shortcuts and recipes dialogs open visibly', async ({ page }) => {
    await page.goto('/#/inspector');
    await page.getByRole('button', { name: /Inspector Menu/i }).click();
    await page.getByRole('button', { name: 'Shortcuts' }).first().click();
    const shortcutsDialog = page.getByRole('dialog', { name: 'Inspector shortcuts' });
    await expect(shortcutsDialog).toBeVisible();
    await expect(page.getByText('Inspector shortcuts')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(shortcutsDialog).toBeHidden();

    await page.getByRole('button', { name: /Inspector Menu/i }).click();
    await page.getByRole('button', { name: 'Open Recipes' }).first().click();
    const recipesDialog = page.getByRole('dialog', { name: 'Inspector recipes' });
    await expect(recipesDialog).toBeVisible();
    await expect(page.getByText('View Recipes')).toBeVisible();
  });
});
