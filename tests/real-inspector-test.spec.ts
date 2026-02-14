import { test } from '@playwright/test';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.join(__dirname, '..', 'Crime_Data_from_2020_to_Present.csv');

test('Real-world Inspector test with actual CSV file', async ({ page }) => {
  console.log('\n========================================');
  console.log('REAL BROWSER TEST - Inspector with Crime Data CSV');
  console.log('========================================\n');
  
  // Capture ALL console output
  const consoleMessages: any[] = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text, time: new Date().toISOString() });
    
    // Print to test output
    if (type === 'error') {
      console.log(`❌ [${type}] ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  [${type}] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  // Step 1: Navigate
  console.log('Step 1: Navigating to Inspector...');
  await page.goto('http://127.0.0.1:5173/#/inspector');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('✅ Page loaded\n');
  
  // Step 2: Verify menu button
  console.log('Step 2: Checking menu button...');
  const menuButton = page.locator('button:has-text("Inspector")').first();
  const menuVisible = await menuButton.isVisible();
  console.log(`${menuVisible ? '✅' : '❌'} Menu button visible: ${menuVisible}\n`);
  
  // Step 3: Open menu and check structure
  console.log('Step 3: Opening menu...');
  await menuButton.click();
  await page.waitForTimeout(500);
  
  const dataSection = await page.locator('text=DATA').count();
  const uploadButton = await page.locator('text=📤 Upload...').count();
  console.log(`${dataSection > 0 ? '✅' : '❌'} DATA section found: ${dataSection > 0}`);
  console.log(`${uploadButton > 0 ? '✅' : '❌'} Upload button found: ${uploadButton > 0}\n`);
  
  // Step 4: Upload the actual CSV
  console.log('Step 4: Uploading Crime Data CSV (244MB)...');
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('text=📤 Upload...').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(CSV_PATH);
  console.log('✅ File selected, waiting for load...\n');
  
  // Step 5: Wait for data to actually load (be patient with 244MB)
  console.log('Step 5: Waiting for data to load (this may take 10-15 seconds)...');
  await page.waitForTimeout(15000);
  
  // Check if data loaded by looking for row count
  const rowCountText = await page.locator('text=/\\d+ rows/i').first().textContent().catch(() => null);
  console.log(`Row count indicator: ${rowCountText || 'Not found'}`);
  
  // Check if grid has data
  const gridVisible = await page.locator('[role="grid"]').count();
  console.log(`${gridVisible > 0 ? '✅' : '❌'} Grid visible: ${gridVisible > 0}`);
  
  // Look for actual data cells
  const dataCells = await page.locator('[role="gridcell"]').count();
  console.log(`${dataCells > 0 ? '✅' : '❌'} Data cells rendered: ${dataCells}\n`);
  
  // Step 6: Test menu items after data load
  console.log('Step 6: Testing menu items with loaded data...');
  await menuButton.click();
  await page.waitForTimeout(500);
  
  const advancedBuilder = page.locator('text=🔧 Advanced Builder');
  const isEnabled = await advancedBuilder.isEnabled();
  console.log(`${isEnabled ? '✅' : '⚠️ '} Advanced Builder enabled: ${isEnabled}`);
  
  const schemaButton = page.locator('text=📊 Schema Inspector');
  const schemaVisible = await schemaButton.isVisible();
  console.log(`${schemaVisible ? '✅' : '❌'} Schema Inspector visible: ${schemaVisible}\n`);
  
  // Step 7: Try to open Schema Inspector
  if (schemaVisible) {
    console.log('Step 7: Opening Schema Inspector...');
    await schemaButton.click();
    await page.waitForTimeout(2000);
    
    // Look for schema modal indicators
    const modalOpen = await page.locator('text=/schema/i').count() > 3;
    console.log(`${modalOpen ? '✅' : '⚠️ '} Schema modal appears open: ${modalOpen}\n`);
  }
  
  // Step 8: Check console for errors
  console.log('Step 8: Console analysis...');
  const errors = consoleMessages.filter(m => m.type === 'error');
  const warnings = consoleMessages.filter(m => m.type === 'warning');
  
  console.log(`Console errors: ${errors.length}`);
  console.log(`Console warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.text}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS FOUND:');
    warnings.slice(0, 3).forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.text}`);
    });
  }
  
  // Take screenshot
  await page.screenshot({ 
    path: 'test-results/real-inspector-test.png',
    fullPage: false
  });
  
  console.log('\n========================================');
  console.log('TEST COMPLETE');
  console.log(`✅ Menu: ${menuVisible ? 'Working' : 'BROKEN'}`);
  console.log(`✅ Upload: ${dataCells > 0 ? 'Working' : 'Unknown'}`);
  console.log(`✅ Console: ${errors.length} errors`);
  console.log('Screenshot: test-results/real-inspector-test.png');
  console.log('========================================\n');
});
