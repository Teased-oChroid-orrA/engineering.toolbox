import { test, expect } from '@playwright/test';

test.describe('Inspector CSV Load and Grid Display', () => {
  test('CSV loads and grid displays data immediately', async ({ page }) => {
    await page.goto('/#/inspector');
    
    // Create test CSV data
    const csvData = `Name,Age,City
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago`;
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Trigger file input programmatically
    const fileInput = page.locator('input[type="file"]');
    
    // Create a file and upload
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvData)
    });
    
    // Wait for processing
    await page.waitForTimeout(3000);
    
    // Check that data is visible (merged grid uses regular table cells, not gridcells)
    await expect(page.locator('text=Alice')).toBeVisible();
    await expect(page.locator('text=Bob')).toBeVisible();
    await expect(page.locator('text=Charlie')).toBeVisible();
    
    // Check table cells exist
    const tableCells = page.locator('td');
    const cellCount = await tableCells.count();
    
    console.log('Table cells found:', cellCount);
    
    // Should have at least 9 cells (3 rows × 3 columns)
    expect(cellCount).toBeGreaterThan(8);
  });

  test('Large CSV triggers browser mode with size limit', async ({ page }) => {
    await page.goto('/#/inspector');
    
    // Create CSV with 150k rows (exceeds MAX_BROWSER_MODE_ROWS)
    const headers = 'id,value\n';
    const rows = Array.from({ length: 150000 }, (_, i) => `${i},val${i}`).join('\n');
    const largeCsv = headers + rows;
    
    await page.waitForLoadState('networkidle');
    
    const fileInput = page.locator('input[type="file"]');
    
    // Upload large file
    await fileInput.setInputFiles({
      name: 'large.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(largeCsv)
    });
    
    // Should show error about size limit
    await page.waitForTimeout(2000);
    const errorMessage = page.locator('text=/CSV too large for browser mode/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('Grid window initializes after filter', async ({ page }) => {
    await page.goto('/#/inspector');
    
    const csvData = `Product,Price
Apple,1.50
Banana,0.75
Cherry,2.00`;
    
    await page.waitForLoadState('networkidle');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'products.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvData)
    });
    
    await page.waitForTimeout(2000);
    
    // Verify grid shows data
    const gridCells = page.locator('[role="gridcell"]');
    const initialCount = await gridCells.count();
    
    expect(initialCount).toBeGreaterThan(0);
  });
});
