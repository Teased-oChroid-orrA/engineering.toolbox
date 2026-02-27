import { test, expect, type Page } from '@playwright/test';

const csvWithHeaders = `Name,Age,City
Alice,30,NYC
Bob,25,LA`;

const csvNoHeaders = `100,200,300
101,201,301`;
const makeCsv = (prefix: string, count: number) => {
  const rows = ['Name,Age,City'];
  for (let i = 0; i < count; i++) rows.push(`${prefix}-${i + 1},${20 + (i % 30)},City-${i % 5}`);
  return rows.join('\n');
};

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
        buffer: Buffer.from(makeCsv('alpha', 120), 'utf-8')
      },
      {
        name: 'no-headers.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(makeCsv('bravo', 120), 'utf-8')
      }
    ]);

    const fileChips = page.locator('[data-testid="inspector-loaded-files"] button[title^="Click to unload:"]');
    await expect(fileChips).toHaveCount(2, { timeout: 10000 });
    await expect(page.locator('[data-testid="inspector-metrics-bar"]').getByText('Across 2 files')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('with-headers', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('no-headers', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    const queryInput = page.locator('[data-inspector-query-input="true"]').first();
    await queryInput.fill('bravo-1');
    await expect(page.getByText('bravo-1', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await queryInput.fill('');
    await page.screenshot({ path: 'artifacts/inspector-tests/08-multi-file-top-label.png', fullPage: true });

    const mergedCurrentSource = page.locator('[data-testid="inspector-merged-current-source"]').first();
    await expect(mergedCurrentSource).toContainText('with-headers', { timeout: 10000 });

    const gridHost = page.locator('div[style*="height: 60vh"]').filter({ has: page.getByRole('columnheader', { name: 'Name' }) }).first();
    await gridHost.evaluate((el) => { el.scrollTop = 2200; });
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'artifacts/inspector-tests/09-multi-file-scrolled-label.png', fullPage: true });
    await gridHost.evaluate((el) => { el.scrollTop = 12000; });
    await page.waitForTimeout(350);
    await expect(mergedCurrentSource).toContainText('no-headers', { timeout: 10000 });
    await page.screenshot({ path: 'artifacts/inspector-tests/10-multi-file-next-dataset-label.png', fullPage: true });

    await page.locator('[data-testid="inspector-loaded-files"] button[title^="Close file:"]').first().click();
    await expect(fileChips).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('[data-testid="inspector-metrics-bar"]').getByText('Across 1 files')).toHaveCount(0);

    await page.locator('[data-testid="inspector-loaded-files"] button[title^="Close file:"]').first().click();
    await expect(fileChips).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('[data-testid="inspector-loaded-files"]')).toContainText('No file loaded yet.', { timeout: 10000 });
    await expect(page.locator('[data-testid="inspector-loaded-files"]')).not.toContainText('Merged rows in table:');
    await page.screenshot({ path: 'artifacts/inspector-tests/inspector-auto-upload-unload.png', fullPage: true });
  });
});
