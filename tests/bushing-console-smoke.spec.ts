import { expect, test } from '@playwright/test';

test('bushing workflow transitions stay free of console and page errors', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/#/bushing');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Engineering Review' }).click();
  await page.getByRole('button', { name: 'Quick Solve' }).click();
  await page.getByRole('button', { name: 'Advanced' }).first().click();
  await page.getByText('Enable Measured').click();
  await page.getByRole('button', { name: 'Engineering Review' }).click();
  await page.getByRole('button', { name: 'Quick Solve' }).click();
  await page.waitForTimeout(500);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
