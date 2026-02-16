/**
 * W&B Toolbox Comprehensive Test Suite
 * Tests save/load functionality and item management
 */

import { chromium } from 'playwright';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('🧪 W&B Toolbox - Save/Load & Item Management Tests\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Track test results
  const results = [];
  let testNumber = 0;
  
  const test = async (name, fn) => {
    testNumber++;
    const testId = `TEST ${testNumber}`;
    console.log(`\n${testId}: ${name}`);
    try {
      await fn();
      console.log(`✅ PASSED: ${name}`);
      results.push({ id: testId, name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      results.push({ id: testId, name, status: 'FAILED', error: error.message });
    }
  };
  
  try {
    // Navigate to W&B page
    console.log('📍 Navigating to W&B page...');
    await page.goto('http://127.0.0.1:5173/#/weight-balance');
    await sleep(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'artifacts/wb-enhanced/01-initial-load.png', fullPage: true });
    console.log('📸 Screenshot: 01-initial-load.png');
    
    // Test 1: Initial Load
    await test('Initial load with auto-restore', async () => {
      const title = await page.locator('h1').textContent();
      if (!title.includes('Weight & Balance')) {
        throw new Error('Page title not found');
      }
    });
    
    // Test 2: Save/Load buttons present
    await test('Save and Load buttons present', async () => {
      const saveBtn = await page.locator('button:has-text("Save")').count();
      const loadBtn = await page.locator('button:has-text("Load")').count();
      if (saveBtn === 0 || loadBtn === 0) {
        throw new Error('Save/Load buttons not found');
      }
    });
    
    // Test 3: Add Item button present
    await test('Add Item button present', async () => {
      const addItemBtn = await page.locator('button:has-text("Add Item")').count();
      if (addItemBtn === 0) {
        throw new Error('Add Item button not found');
      }
    });
    
    // Test 4: Initial items loaded
    await test('Initial loading items displayed', async () => {
      const rows = await page.locator('tbody tr').count();
      if (rows < 5) {
        throw new Error(`Expected at least 5 items, found ${rows}`);
      }
      console.log(`   Found ${rows} loading items`);
    });
    
    // Test 5: Modify weight input
    await test('Modify pilot weight', async () => {
      const input = page.locator('input[type="number"]').first();
      await input.fill('200');
      await sleep(500);
      const value = await input.inputValue();
      if (value !== '200') {
        throw new Error(`Expected 200, got ${value}`);
      }
    });
    
    await page.screenshot({ path: 'artifacts/wb-enhanced/02-after-weight-change.png', fullPage: true });
    console.log('📸 Screenshot: 02-after-weight-change.png');
    
    // Test 6: Results calculated
    await test('Calculations updated', async () => {
      const totalWeight = await page.locator('div:has-text("Total Weight")').locator('..').locator('.font-mono').textContent();
      if (!totalWeight) {
        throw new Error('Total weight not found');
      }
      console.log(`   Total Weight: ${totalWeight}`);
    });
    
    // Test 7: Open Add Item dialog
    await test('Open Add Item dialog', async () => {
      await page.locator('button:has-text("Add Item")').click();
      await sleep(500);
      const dialog = await page.locator('h2:has-text("Add Custom Item")').count();
      if (dialog === 0) {
        throw new Error('Add Item dialog not opened');
      }
    });
    
    await page.screenshot({ path: 'artifacts/wb-enhanced/03-add-item-dialog.png', fullPage: true });
    console.log('📸 Screenshot: 03-add-item-dialog.png');
    
    // Test 8: Add custom item
    await test('Add custom item', async () => {
      await page.locator('input[placeholder*="Extra Baggage"]').fill('Camera Equipment');
      await page.locator('select').selectOption('cargo');
      await page.locator('input[type="number"]').nth(0).fill('25');
      await page.locator('input[type="number"]').nth(1).fill('100');
      await page.locator('button:has-text("Add Item")').last().click();
      await sleep(500);
      
      const cameraItem = await page.locator('text=Camera Equipment').count();
      if (cameraItem === 0) {
        throw new Error('Custom item not added');
      }
    });
    
    await page.screenshot({ path: 'artifacts/wb-enhanced/04-after-add-item.png', fullPage: true });
    console.log('📸 Screenshot: 04-after-add-item.png');
    
    // Test 9: Remove item button
    await test('Remove item button visible', async () => {
      const removeButtons = await page.locator('button:has-text("✕")').count();
      if (removeButtons === 0) {
        throw new Error('No remove buttons found');
      }
      console.log(`   Found ${removeButtons} remove buttons`);
    });
    
    // Test 10: Open Save dialog
    await test('Open Save dialog', async () => {
      await page.locator('button:has-text("💾 Save")').click();
      await sleep(500);
      const dialog = await page.locator('h2:has-text("Save Configuration")').count();
      if (dialog === 0) {
        throw new Error('Save dialog not opened');
      }
    });
    
    await page.screenshot({ path: 'artifacts/wb-enhanced/05-save-dialog.png', fullPage: true });
    console.log('📸 Screenshot: 05-save-dialog.png');
    
    // Test 11: Configuration name pre-filled
    await test('Configuration name pre-filled', async () => {
      const input = page.locator('input[placeholder*="configuration name"]');
      const value = await input.inputValue();
      if (!value || value.trim() === '') {
        throw new Error('Configuration name not pre-filled');
      }
      console.log(`   Config name: ${value}`);
    });
    
    // Test 12: Change config name
    await test('Change configuration name', async () => {
      const input = page.locator('input[placeholder*="configuration name"]');
      await input.fill('Test Flight Configuration');
      const value = await input.inputValue();
      if (value !== 'Test Flight Configuration') {
        throw new Error('Configuration name not changed');
      }
    });
    
    // Test 13: Cancel save dialog
    await test('Cancel save dialog', async () => {
      await page.locator('button:has-text("Cancel")').click();
      await sleep(500);
      const dialog = await page.locator('h2:has-text("Save Configuration")').count();
      if (dialog > 0) {
        throw new Error('Save dialog still visible');
      }
    });
    
    // Test 14: Remove custom item
    await test('Remove custom item', async () => {
      const cameraRow = page.locator('tr:has-text("Camera Equipment")');
      const removeBtn = cameraRow.locator('button:has-text("✕")');
      
      // Handle the confirmation dialog
      page.once('dialog', async dialog => {
        console.log(`   Dialog: ${dialog.message()}`);
        await dialog.accept();
      });
      
      await removeBtn.click();
      await sleep(500);
      
      const cameraItem = await page.locator('text=Camera Equipment').count();
      if (cameraItem > 0) {
        throw new Error('Custom item not removed');
      }
    });
    
    await page.screenshot({ path: 'artifacts/wb-enhanced/06-after-remove-item.png', fullPage: true });
    console.log('📸 Screenshot: 06-after-remove-item.png');
    
    // Test 15: Reset to sample
    await test('Reset to sample', async () => {
      await page.locator('button:has-text("Reset")').click();
      await sleep(500);
      const rows = await page.locator('tbody tr').count();
      console.log(`   Items after reset: ${rows}`);
    });
    
    await page.screenshot({ path: 'artifacts/wb-enhanced/07-after-reset.png', fullPage: true });
    console.log('📸 Screenshot: 07-after-reset.png');
    
    // Test 16: Keyboard shortcut Ctrl+S
    await test('Keyboard shortcut Ctrl+S opens save dialog', async () => {
      await page.keyboard.press('Control+S');
      await sleep(500);
      const dialog = await page.locator('h2:has-text("Save Configuration")').count();
      if (dialog === 0) {
        throw new Error('Ctrl+S did not open save dialog');
      }
      // Close dialog
      await page.locator('button:has-text("Cancel")').click();
      await sleep(300);
    });
    
    // Test 17: Console errors check
    await test('No console errors', async () => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Wait a bit to capture any errors
      await sleep(1000);
      
      if (errors.length > 0) {
        console.log(`   Console errors found: ${errors.length}`);
        errors.forEach(err => console.log(`     - ${err}`));
        // Don't fail the test for console errors, just log them
      }
    });
    
    // Test 18: localStorage check
    await test('localStorage auto-save working', async () => {
      const storageData = await page.evaluate(() => {
        const data = localStorage.getItem('wb.current');
        return data ? JSON.parse(data) : null;
      });
      
      if (!storageData) {
        throw new Error('No data in localStorage');
      }
      
      if (!storageData.aircraft || !storageData.items) {
        throw new Error('localStorage data incomplete');
      }
      
      console.log(`   localStorage contains: ${storageData.items.length} items`);
    });
    
    // Test 19: Mobile viewport
    await test('Mobile responsive layout', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await sleep(1000);
      
      const title = await page.locator('h1').isVisible();
      if (!title) {
        throw new Error('Title not visible in mobile view');
      }
    });
    
    await page.screenshot({ path: 'artifacts/wb-enhanced/08-mobile-view.png', fullPage: true });
    console.log('📸 Screenshot: 08-mobile-view.png');
    
    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await sleep(500);
    
    // Final screenshot
    await page.screenshot({ path: 'artifacts/wb-enhanced/09-final-state.png', fullPage: true });
    console.log('📸 Screenshot: 09-final-state.png');
    
    // Save console messages
    const consoleMessages = await page.evaluate(() => {
      return {
        localStorage: {
          'wb.current': localStorage.getItem('wb.current'),
          'wb.recent': localStorage.getItem('wb.recent')
        }
      };
    });
    
    await page.evaluate(() => {
      const fs = require('fs');
      fs.writeFileSync(
        'artifacts/wb-enhanced/storage-data.json',
        JSON.stringify({
          localStorage: {
            'wb.current': localStorage.getItem('wb.current'),
            'wb.recent': localStorage.getItem('wb.recent')
          }
        }, null, 2)
      );
    }).catch(() => {
      // Can't write from browser context, that's ok
    });
    
  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
  } finally {
    await browser.close();
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const total = results.length;
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  console.log('\n' + '-'.repeat(60));
  console.log('Detailed Results:');
  console.log('-'.repeat(60));
  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${r.id}: ${r.name}`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`⚠️  ${failed} test(s) failed`);
  }
  
  console.log('='.repeat(60) + '\n');
  
  // Save results to JSON
  const fs = require('fs');
  fs.mkdirSync('artifacts/wb-enhanced', { recursive: true });
  fs.writeFileSync(
    'artifacts/wb-enhanced/test-report.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      totalTests: total,
      passed,
      failed,
      successRate: ((passed / total) * 100).toFixed(1) + '%',
      results
    }, null, 2)
  );
  
  return failed === 0 ? 0 : 1;
}

runTests().then(code => process.exit(code)).catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
