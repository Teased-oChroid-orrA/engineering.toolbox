import { expect, test } from '@playwright/test';

test('bushing information view opens and navigates tabs without page errors', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/#/bushing');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Information' }).click();

  await expect(page.getByRole('button', { name: /Back To Main View/ })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Bushing Engineering Derivation Atlas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();

  await page.getByRole('button', { name: 'Fit + Stress' }).click();
  await expect(page.getByText('Fit + Stress Derivations')).toBeVisible();

  await page.getByRole('button', { name: 'Geometry + Review' }).click();
  await expect(page.getByText('Geometry + Review Derivations')).toBeVisible();

  await page.getByRole('button', { name: 'Appendix' }).click();
  await expect(page.getByRole('heading', { name: 'Formula Provenance' })).toBeVisible();

  await expect(pageErrors).toEqual([]);
  await expect(consoleErrors).toEqual([]);
});
