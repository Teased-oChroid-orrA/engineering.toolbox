import { test, expect } from '@playwright/test';

test('Inspector CSV load and grid display - REAL TEST', async ({ page }) => {
  // Capture console for debugging
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
  });

  console.log('Nav to inspector...');
  await page.goto('/#/inspector');
  await page.waitForTimeout(2000);
  
  // Find the hidden file input
  const fileInput = page.locator('input[type="file"]').first();
  
  // Create inline CSV
  const csvContent = `Name,Age,City,Score
Alice,30,NYC,95.5
Bob,25,LA,87.3
Charlie,35,Chicago,92.1
Diana,28,Seattle,89.7
Eve,32,Boston,91.2`;
  
  await fileInput.setInputFiles({
    name: 'test-data.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  });
  
  // Manually trigger the change event
  await fileInput.dispatchEvent('change');
  
  console.log('✓ CSV file uploaded and change event dispatched');
  
  // Wait for processing
  await page.waitForTimeout(5000);
  
  // Check file input logs
  const fileInputLogs = consoleLogs.filter(log => log.includes('[FILE INPUT]'));
  console.log(`\nFile input handler calls: ${fileInputLogs.length}`);
  if (fileInputLogs.length > 0) {
    console.log('File input logs:');
    fileInputLogs.forEach(log => console.log(log));
  } else {
    console.warn('⚠️  File input onchange handler NEVER FIRED!');
  }
  
  // Check for infinite loop (lots of FETCH SLICE logs)
  const fetchSliceLogs = consoleLogs.filter(log => log.includes('[FETCH SLICE]') || log.includes('fetchVisibleSlice'));
  console.log(`\nFetch slice calls: ${fetchSliceLogs.length}`);
  if (fetchSliceLogs.length > 10) {
    console.warn(`⚠️  Possible infinite loop detected! ${fetchSliceLogs.length} fetch calls`);
    console.log('First 10 fetch logs:');
    fetchSliceLogs.slice(0, 10).forEach(log => console.log(log));
  }
  
  // Check grid state
  const gridCells = page.locator('[role="gridcell"]');
  const cellCount = await gridCells.count();
  console.log(`\nGrid cells: ${cellCount}`);
  
  // Check for any visible table cells
  const tableCells = page.locator('td, th').filter({ hasText: /.+/ });
  const tableCellCount = await tableCells.count();
  console.log(`Table cells: ${tableCellCount}`);
  
  // Get all visible text
  const allText = await page.locator('body').textContent();
  const hasNames = allText?.includes('Alice') || allText?.includes('Bob');
  console.log(`Has CSV data in page: ${hasNames}`);
  
  // Assertions
  expect(fileInputLogs.length, 'File input handler should fire').toBeGreaterThan(0);
  expect(fetchSliceLogs.length, 'Should not have infinite loop').toBeLessThan(20);
  expect(cellCount + tableCellCount, 'Should have visible data cells').toBeGreaterThan(0);
});
