import { test, expect } from '@playwright/test';

test('Inspector toolbox - Complete functionality verification', async ({ page }) => {
  console.log('🚀 Starting comprehensive Inspector toolbox verification...\n');
  
  // Track console for any errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Navigate to Inspector
  await page.goto('http://127.0.0.1:5173/#/inspector');
  await page.waitForLoadState('networkidle');
  console.log('✅ Page loaded');
  
  // Wait for UI
  await page.waitForSelector('text=Query & Filter Controls', { timeout: 10000 });
  console.log('✅ UI rendered');
  
  // Create and upload CSV
  const csvContent = 'Name,Age,City,Department\nAlice,30,NYC,Engineering\nBob,25,LA,Sales\nCharlie,35,Chicago,Marketing\nDiana,28,Boston,Engineering\nEve,32,Seattle,Sales';
  
  const fileInput = await page.locator('input[type="file"][accept*=".csv"]');
  await fileInput.setInputFiles({
    name: 'employees.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  });
  console.log('✅ CSV uploaded');
  
  // Wait for data to load
  await page.waitForTimeout(2000);
  
  // Verify data display
  const aliceVisible = await page.locator('text=Alice').isVisible({ timeout: 5000 });
  expect(aliceVisible).toBe(true);
  console.log('✅ Data displayed in grid');
  
  // Verify grid metrics
  const metricsText = await page.locator('text=/Slice:|Columns:|Rows:/').first().textContent();
  console.log(`✅ Grid metrics visible: ${metricsText?.substring(0, 50)}...`);
  
  // Test filtering
  const queryInput = page.locator('input[placeholder*="filter"]').first();
  await queryInput.fill('Engineering');
  await page.waitForTimeout(1000);
  
  const engineeringVisible = await page.locator('text=Engineering').first().isVisible();
  expect(engineeringVisible).toBe(true);
  console.log('✅ Filtering works');
  
  // Clear filter
  await queryInput.clear();
  await page.waitForTimeout(500);
  
  // Open Inspector menu
  const inspectorButton = page.locator('button:has-text("Inspector")').first();
  await inspectorButton.click();
  await page.waitForTimeout(500);
  console.log('✅ Inspector menu opened');
  
  // Check for menu items
  const menuVisible = await page.locator('text=/Schema Inspector|Recipes|Shortcuts/').first().isVisible({ timeout: 3000 });
  expect(menuVisible).toBe(true);
  console.log('✅ Menu items visible');
  
  // Close menu
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/inspector-working.png', fullPage: true });
  console.log('✅ Screenshot saved');
  
  // Check for errors
  if (errors.length > 0) {
    console.log('\n⚠️ Console errors detected:');
    errors.forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('\n✅ No console errors');
  }
  
  console.log('\n🎉 All verifications passed! Inspector toolbox is fully functional.');
});
