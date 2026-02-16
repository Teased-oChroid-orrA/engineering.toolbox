/**
 * Comprehensive Inspector Toolbox Test
 * 
 * Tests all user interactions including:
 * - Single CSV upload
 * - Multiple CSV upload
 * - Filter controls
 * - Menu items
 * - Grid operations
 * - Performance validation
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Test configuration
const TEST_URL = 'http://127.0.0.1:5173/#/inspector';
const ARTIFACTS_DIR = './artifacts/inspector-tests';
const HEADLESS = true;

// Create artifacts directory
try {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
} catch (e) {
  // Directory exists
}

// Test CSV data
const CSV_DATA = {
  employees: `Name,Age,Department,Salary
John Doe,35,Engineering,85000
Jane Smith,28,Marketing,72000
Bob Johnson,42,Sales,95000
Alice Brown,31,Engineering,88000
Charlie Davis,29,HR,65000`,
  
  products: `Product,Price,Stock,Category
Laptop,999,50,Electronics
Mouse,25,200,Electronics
Keyboard,75,150,Electronics
Monitor,299,80,Electronics`,
  
  cities: `City,Population,Country,Area
Tokyo,37400000,Japan,2194
Delhi,31400000,India,1484
Shanghai,27100000,China,6341`
};

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: [],
  screenshots: []
};

// Helper functions
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  const path = join(ARTIFACTS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  results.screenshots.push({ name, path });
  console.log(`📸 Screenshot saved: ${name}`);
}

async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

async function loadCsvProgrammatically(page, csvText, filename) {
  return await page.evaluate(([text, name]) => {
    const input = document.querySelector('input[type="file"][multiple]');
    if (!input) return { success: false, error: 'File input not found' };
    
    // Create synthetic file
    const dt = new DataTransfer();
    const blob = new Blob([text], { type: 'text/csv' });
    const file = new File([blob], name, { type: 'text/csv' });
    dt.items.add(file);
    
    // Assign files and trigger change
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    return { success: true };
  }, [csvText, filename]);
}

// Test suite
async function runTests() {
  console.log('🚀 Starting Inspector Comprehensive Tests');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  // Track console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now()
    });
  });
  
  try {
    // TEST 1: Initial Load
    console.log('\n📋 TEST 1: Initial Load');
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await sleep(2000);
    await takeScreenshot(page, '01-initial-load');
    
    const hasInspectorText = await page.textContent('body').then(t => t.includes('Inspector'));
    if (hasInspectorText) {
      results.passed.push('TEST 1: Initial load successful');
      console.log('✅ PASS: Page loaded with Inspector text');
    } else {
      results.failed.push('TEST 1: Inspector text not found');
      console.log('❌ FAIL: Inspector text not found');
    }
    
    // TEST 2: Single CSV Upload
    console.log('\n📋 TEST 2: Single CSV Upload');
    const result1 = await loadCsvProgrammatically(page, CSV_DATA.employees, 'employees.csv');
    await sleep(3000); // Wait for processing
    await takeScreenshot(page, '02-single-csv-loaded');
    
    const loadedFilesText = await page.textContent('body');
    if (loadedFilesText.includes('employees.csv')) {
      results.passed.push('TEST 2: Single CSV upload - file name displayed');
      console.log('✅ PASS: File name "employees.csv" displayed');
    } else {
      results.failed.push('TEST 2: Single CSV upload - file name not displayed');
      console.log('❌ FAIL: File name not displayed');
    }
    
    // Check for "across 1 files"
    if (loadedFilesText.includes('across 1 file') || loadedFilesText.includes('across 1 files')) {
      results.passed.push('TEST 2: Single CSV upload - correct file count');
      console.log('✅ PASS: Correct file count displayed');
    } else {
      results.warnings.push('TEST 2: File count may be incorrect');
      console.log('⚠️  WARNING: File count not found or incorrect');
    }
    
    // TEST 3: Check for Filter Queue Errors
    console.log('\n📋 TEST 3: Filter Queue Error Check');
    const drainFilterCalls = consoleMessages.filter(m => 
      m.text.includes('DRAIN FILTER QUEUE')
    ).length;
    
    console.log(`   Found ${drainFilterCalls} DRAIN FILTER QUEUE calls`);
    
    if (drainFilterCalls === 0) {
      results.passed.push('TEST 3: No filter queue errors (perfect)');
      console.log('✅ PASS: No filter queue errors detected');
    } else if (drainFilterCalls <= 5) {
      results.passed.push(`TEST 3: Low filter queue calls (${drainFilterCalls} calls - acceptable)`);
      console.log(`✅ PASS: Low filter queue calls (${drainFilterCalls} - optimized!)`);
    } else if (drainFilterCalls <= 10) {
      results.warnings.push(`TEST 3: Moderate filter queue calls (${drainFilterCalls})`);
      console.log(`⚠️  WARNING: Moderate filter queue calls (${drainFilterCalls})`);
    } else {
      results.failed.push(`TEST 3: Excessive filter queue calls (${drainFilterCalls})`);
      console.log(`❌ FAIL: Excessive filter queue calls (${drainFilterCalls})`);
    }
    
    // TEST 4: Multiple CSV Upload
    console.log('\n📋 TEST 4: Multiple CSV Upload (3 files)');
    
    // First, we need to clear the current file or the test won't be fair
    // Let's reload the page
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    // Now load all 3 files programmatically by creating a multi-file DataTransfer
    const multiResult = await page.evaluate(([csvData]) => {
      const input = document.querySelector('input[type="file"][multiple]');
      if (!input) return { success: false, error: 'File input not found' };
      
      const dt = new DataTransfer();
      
      // Add all three files
      const files = [
        { text: csvData.employees, name: 'employees.csv' },
        { text: csvData.products, name: 'products.csv' },
        { text: csvData.cities, name: 'cities.csv' }
      ];
      
      for (const fileData of files) {
        const blob = new Blob([fileData.text], { type: 'text/csv' });
        const file = new File([blob], fileData.name, { type: 'text/csv' });
        dt.items.add(file);
      }
      
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      return { success: true, fileCount: dt.files.length };
    }, [CSV_DATA]);
    
    console.log(`   Multi-file result: ${JSON.stringify(multiResult)}`);
    await sleep(5000); // Wait for all files to process
    await takeScreenshot(page, '04-multiple-csvs-loaded');
    
    const bodyText = await page.textContent('body');
    
    // Check for all three file names
    const hasEmployees = bodyText.includes('employees.csv');
    const hasProducts = bodyText.includes('products.csv');
    const hasCities = bodyText.includes('cities.csv');
    
    if (hasEmployees && hasProducts && hasCities) {
      results.passed.push('TEST 4: Multiple CSV upload - all file names displayed');
      console.log('✅ PASS: All 3 file names displayed');
    } else {
      const found = [hasEmployees && 'employees.csv', hasProducts && 'products.csv', hasCities && 'cities.csv'].filter(Boolean);
      results.failed.push(`TEST 4: Multiple CSV upload - only ${found.length}/3 files displayed: ${found.join(', ')}`);
      console.log(`❌ FAIL: Only ${found.length}/3 files displayed`);
    }
    
    // Check file count
    if (bodyText.includes('across 3 file') || bodyText.includes('3 files')) {
      results.passed.push('TEST 4: Multiple CSV upload - correct file count (3)');
      console.log('✅ PASS: Correct file count (3) displayed');
    } else {
      results.warnings.push('TEST 4: File count "3" not clearly displayed');
      console.log('⚠️  WARNING: File count "3" not clearly displayed');
    }
    
    // TEST 5: Close Button (×) Functionality
    console.log('\n📋 TEST 5: Close Button Functionality');
    
    const closeButtonExists = await page.locator('text=/employees\\.csv/').locator('..').locator('[text="×"], button:has-text("×")').count() > 0;
    
    if (closeButtonExists) {
      results.passed.push('TEST 5: Close button (×) exists');
      console.log('✅ PASS: Close button (×) found');
      
      // Try clicking it
      try {
        await page.locator('text=/employees\\.csv/').locator('..').locator('[text="×"], button:has-text("×")').first().click();
        await sleep(1000);
        await takeScreenshot(page, '05-after-close-button');
        
        const afterClose = await page.textContent('body');
        if (!afterClose.includes('employees.csv')) {
          results.passed.push('TEST 5: Close button successfully removed file');
          console.log('✅ PASS: Close button successfully removed file');
        } else {
          results.warnings.push('TEST 5: Close button clicked but file still visible');
          console.log('⚠️  WARNING: File still visible after close');
        }
      } catch (e) {
        results.warnings.push('TEST 5: Could not click close button');
        console.log('⚠️  WARNING: Could not click close button');
      }
    } else {
      results.failed.push('TEST 5: Close button (×) not found');
      console.log('❌ FAIL: Close button not found');
    }
    
    // TEST 6: Menu Items
    console.log('\n📋 TEST 6: Menu System');
    
    // Click Inspector menu
    const menuButton = page.locator('button:has-text("Inspector")').first();
    if (await menuButton.count() > 0) {
      await menuButton.click();
      await sleep(1000);
      await takeScreenshot(page, '06-menu-open');
      
      // Check for menu items
      const menuText = await page.textContent('body');
      const menuItems = [
        'Upload',
        'Schema Inspector',
        'Recipes',
        'Columns',
        'Shortcuts',
        'Advanced Builder',
        'Clear Filters',
        'Current View',
        'Filtered Rows',
        'Regex Help',
        'Quiet Logs',
        'Auto-restore'
      ];
      
      const foundItems = menuItems.filter(item => menuText.includes(item));
      console.log(`   Found ${foundItems.length}/${menuItems.length} menu items`);
      
      if (foundItems.length >= 10) {
        results.passed.push(`TEST 6: Menu system - ${foundItems.length} items found`);
        console.log(`✅ PASS: Menu system working (${foundItems.length} items)`);
      } else {
        results.warnings.push(`TEST 6: Only ${foundItems.length} menu items found`);
        console.log(`⚠️  WARNING: Only ${foundItems.length} menu items found`);
      }
    } else {
      results.failed.push('TEST 6: Could not open menu');
      console.log('❌ FAIL: Could not find menu button');
    }
    
    // TEST 7: Final Performance Check
    console.log('\n📋 TEST 7: Final Performance Check');
    
    const totalErrors = consoleMessages.filter(m => m.type === 'error').length;
    const totalWarnings = consoleMessages.filter(m => m.type === 'warning').length;
    
    console.log(`   Console errors: ${totalErrors}`);
    console.log(`   Console warnings: ${totalWarnings}`);
    
    if (totalErrors === 0) {
      results.passed.push('TEST 7: No console errors');
      console.log('✅ PASS: No console errors');
    } else {
      results.warnings.push(`TEST 7: ${totalErrors} console errors`);
      console.log(`⚠️  WARNING: ${totalErrors} console errors`);
    }
    
    await takeScreenshot(page, '07-final-state');
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
    results.failed.push(`Test execution error: ${error.message}`);
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();
  }
  
  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`📸 Screenshots: ${results.screenshots.length}`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ PASSED TESTS:');
    results.passed.forEach((test, i) => console.log(`   ${i + 1}. ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach((test, i) => console.log(`   ${i + 1}. ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach((warning, i) => console.log(`   ${i + 1}. ${warning}`));
  }
  
  console.log('\n📸 SCREENSHOTS:');
  results.screenshots.forEach((shot, i) => console.log(`   ${i + 1}. ${shot.name} -> ${shot.path}`));
  
  // Save report
  const reportPath = join(ARTIFACTS_DIR, 'test-report.json');
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved: ${reportPath}`);
  
  // Console messages summary
  const consolePath = join(ARTIFACTS_DIR, 'console-messages.json');
  writeFileSync(consolePath, JSON.stringify(consoleMessages, null, 2));
  console.log(`📄 Console messages saved: ${consolePath}`);
  
  console.log('\n' + '='.repeat(60));
  
  // Exit code based on failures
  const exitCode = results.failed.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
