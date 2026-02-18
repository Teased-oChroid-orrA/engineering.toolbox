import { test, expect, type Page } from '@playwright/test';

const csvWithHeaders = `Name,Age,City
Alice,30,NYC
Bob,25,LA`;

const csvNoHeaders = `100,200,300
101,201,301`;

test.describe('Inspector auto header load/unload regression', () => {
  const inspectorMenuButton = (page: Page) =>
    page.locator('button:has-text("Inspector ▾")').first();

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/inspector');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
  });

  test('Load File triggers file picker in Auto mode', async ({ page }) => {
    await page.selectOption('select', 'auto');

    await inspectorMenuButton(page).click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('text=📂 Load File...').click();
    const chooser = await chooserPromise;
    expect(chooser).toBeTruthy();
    await page.screenshot({ path: 'artifacts/inspector-tests/inspector-auto-load-file.png', fullPage: true });
  });

  test('Upload in Auto mode supports multiple files and close click unloads file chips', async ({ page }) => {
    await page.selectOption('select', 'auto');

    const csvInput = page.locator('input[type="file"][accept*="csv"]').first();
    await expect(csvInput).toHaveCount(1);
    await csvInput.setInputFiles([
      {
        name: 'with-headers.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvWithHeaders, 'utf-8')
      },
      {
        name: 'no-headers.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvNoHeaders, 'utf-8')
      }
    ]);

    const fileChips = page.locator('[data-testid="inspector-loaded-files"] button[title^="Click to unload:"]');
    await expect(fileChips).toHaveCount(2, { timeout: 10000 });
    await expect(page.locator('[data-testid="inspector-metrics-bar"]').getByText('Across 2 files')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="inspector-loaded-files"] button[title^="Close file:"]').first().click();
    await expect(fileChips).toHaveCount(1, { timeout: 10000 });
    await page.screenshot({ path: 'artifacts/inspector-tests/inspector-auto-upload-unload.png', fullPage: true });
  });
});
