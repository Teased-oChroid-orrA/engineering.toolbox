import { test, expect } from '@playwright/test';

test('Inspector CSV upload and display', async ({ page }) => {
  console.log('Navigating to inspector page...');
  await page.goto('/#/inspector');
  
  // Wait for page load
  await page.waitForTimeout(2000);
  
  // Check if Inspector button exists (corrected locator)
  const menuButton = page.getByRole('button', { name: /^Inspector/i });
  await expect(menuButton).toBeVisible();
  console.log('✓ Menu button visible');
  
  // Click menu
  await menuButton.click();
  console.log('✓ Menu clicked');
  
  // Click Upload option
  const uploadOption = page.getByRole('button', { name: /📤 Upload/i });
  await expect(uploadOption).toBeVisible();
  await uploadOption.click();
  console.log('✓ Upload clicked');
  
  // Check if file input appears (it might be hidden)
  await page.waitForTimeout(500);
  
  // Create a simple CSV and upload
  const csvContent = `Name,Age,City
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago`;
  
  // Set the file input (findying the hidden input)
  const fileInput = page.locator('input[type="file"]');
  
  // Create a buffer from CSV content
  await fileInput.setInputFiles({
    name: 'test-data.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  });
  
  console.log('✓ CSV file set');
  
  // Wait for CSV to load
  await page.waitForTimeout(3000);
  
  // Check if grid has data
  const gridCells = page.locator('[role="gridcell"]');
  const cellCount = await gridCells.count();
  console.log(`Grid cells found: ${cellCount}`);
  
  // Check if headers are visible
  const headers = await page.locator('text=Name').count();
  console.log(`Name header count: ${headers}`);
  
  expect(cellCount).toBeGreaterThan(0);
  expect(headers).toBeGreaterThan(0);
});
