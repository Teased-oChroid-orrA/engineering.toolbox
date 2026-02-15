import { test, expect } from '@playwright/test';

test('Inspector CSV data displays in grid', async ({ page }) => {
  // Navigate to inspector
  await page.goto('/#/inspector');
  
  // Wait for Inspector menu button
  const menuButton = page.getByRole('button', { name: /^Inspector/i });
  await expect(menuButton).toBeVisible({ timeout: 5000 });
  await menuButton.click();
  
  // Click Upload
  const uploadOption = page.getByRole('button', { name: /📤 Upload/i });
  await expect(uploadOption).toBeVisible({ timeout: 2000 });
  await uploadOption.click();
  
  // Upload CSV
  const csvContent = `Name,Age,City
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago`;
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test-data.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  });
  
  // Wait for data to be loaded - look for the row count indicator
  await expect(page.locator('text=/Rows.*3/')).toBeVisible({ timeout: 5000 });
  
  // Check that the VirtualGrid table is visible
  const table = page.locator('table').first();
  await expect(table).toBeVisible({ timeout: 3000 });
  
  // Check for column headers using columnheader role
  const nameHeader = page.getByRole('columnheader', { name: /Name/i }).first();
  const ageHeader = page.getByRole('columnheader', { name: /Age/i }).first();
  const cityHeader = page.getByRole('columnheader', { name: /City/i }).first();
  
  await expect(nameHeader).toBeVisible();
  await expect(ageHeader).toBeVisible();
  await expect(cityHeader).toBeVisible();
  
  // Check for data rows - use cell role
  const cells = page.getByRole('cell');
  await expect(cells).toHaveCount(9); // 3 rows × 3 columns = 9 cells
  
  // Check for specific cell content
  await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Bob' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Charlie' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'NYC' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'LA' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Chicago' })).toBeVisible();
  
  console.log('✅ CSV data successfully displayed in grid');
});
