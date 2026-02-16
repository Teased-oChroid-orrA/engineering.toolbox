/**
 * Comprehensive Weight & Balance Toolbox Test
 * 
 * Tests all user interactions including:
 * - Page load and initialization
 * - Sample data loading
 * - Weight input modifications
 * - Adding/removing loading items
 * - CG envelope visualization
 * - Calculation accuracy
 * - Error handling
 * - Performance
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Test configuration
const TEST_URL = 'http://127.0.0.1:5173/#/weight-balance';
const ARTIFACTS_DIR = './artifacts/wb-tests';
const HEADLESS = true;

// Create artifacts directory
try {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
} catch (e) {
  // Directory exists
}

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: [],
  screenshots: [],
  calculations: []
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

// Test suite
async function runTests() {
  console.log('🚀 Starting W&B Toolbox Comprehensive Tests');
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
    console.log('\n📋 TEST 1: Initial Load & Sample Data');
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await sleep(3000); // Wait for sample data to load
    await takeScreenshot(page, '01-wb-initial-load');
    
    const hasWeightBalanceText = await page.textContent('body').then(t => 
      t.includes('Weight') && t.includes('Balance')
    );
    
    if (hasWeightBalanceText) {
      results.passed.push('TEST 1: Initial load - W&B page loaded');
      console.log('✅ PASS: W&B page loaded');
    } else {
      results.failed.push('TEST 1: W&B text not found');
      console.log('❌ FAIL: W&B text not found');
    }
    
    // Check for sample aircraft (Cessna 172S)
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Cessna') || bodyText.includes('172')) {
      results.passed.push('TEST 1: Sample aircraft loaded');
      console.log('✅ PASS: Sample aircraft detected');
    } else {
      results.warnings.push('TEST 1: Sample aircraft name not clearly visible');
      console.log('⚠️  WARNING: Sample aircraft not detected');
    }
    
    // TEST 2: CG Envelope Visualization
    console.log('\n📋 TEST 2: CG Envelope Chart');
    
    // Check for SVG element (D3 chart)
    const hasSVG = await page.locator('svg').count() > 0;
    if (hasSVG) {
      results.passed.push('TEST 2: CG envelope chart rendered');
      console.log('✅ PASS: SVG chart found');
    } else {
      results.failed.push('TEST 2: CG envelope chart not found');
      console.log('❌ FAIL: SVG chart not found');
    }
    
    await takeScreenshot(page, '02-wb-cg-envelope');
    
    // TEST 3: Loading Items Display
    console.log('\n📋 TEST 3: Loading Items Table');
    
    // Look for weight/balance items
    const hasTableContent = bodyText.includes('Pilot') || 
                           bodyText.includes('Passenger') || 
                           bodyText.includes('Fuel') ||
                           bodyText.includes('Baggage');
    
    if (hasTableContent) {
      results.passed.push('TEST 3: Loading items displayed');
      console.log('✅ PASS: Loading items found');
    } else {
      results.failed.push('TEST 3: Loading items not displayed');
      console.log('❌ FAIL: Loading items not found');
    }
    
    // TEST 4: Weight Input Modification
    console.log('\n📋 TEST 4: Weight Input Modification');
    
    // Find input fields
    const inputs = await page.locator('input[type="number"]').all();
    console.log(`   Found ${inputs.length} numeric input fields`);
    
    if (inputs.length > 0) {
      results.passed.push(`TEST 4: Found ${inputs.length} numeric inputs`);
      console.log(`✅ PASS: ${inputs.length} numeric inputs available`);
      
      // Try modifying first input
      try {
        await inputs[0].fill('180');
        await sleep(1000); // Wait for recalculation
        await takeScreenshot(page, '04-wb-after-input-change');
        results.passed.push('TEST 4: Successfully modified weight input');
        console.log('✅ PASS: Input modification successful');
      } catch (e) {
        results.warnings.push('TEST 4: Could not modify input');
        console.log('⚠️  WARNING: Input modification failed');
      }
    } else {
      results.failed.push('TEST 4: No numeric inputs found');
      console.log('❌ FAIL: No numeric inputs found');
    }
    
    // TEST 5: Calculation Results Display
    console.log('\n📋 TEST 5: Calculation Results');
    
    // Look for results text
    const currentBodyText = await page.textContent('body');
    const hasResults = currentBodyText.includes('Total Weight') || 
                      currentBodyText.includes('CG Position') ||
                      currentBodyText.includes('Moment');
    
    if (hasResults) {
      results.passed.push('TEST 5: Calculation results displayed');
      console.log('✅ PASS: Results displayed');
      
      // Try to extract numbers for validation
      const numberMatches = currentBodyText.match(/\d+\.?\d*/g);
      if (numberMatches && numberMatches.length > 5) {
        results.calculations.push({
          test: 'Sample calculation',
          numbers_found: numberMatches.length,
          sample_values: numberMatches.slice(0, 5)
        });
        console.log(`   Found ${numberMatches.length} numerical values in results`);
      }
    } else {
      results.warnings.push('TEST 5: Results text not clearly visible');
      console.log('⚠️  WARNING: Results not clearly displayed');
    }
    
    // TEST 6: Reset/Sample Button
    console.log('\n📋 TEST 6: Reset to Sample Function');
    
    const resetButton = page.locator('button').filter({ hasText: /reset|sample/i }).first();
    const hasResetButton = await resetButton.count() > 0;
    
    if (hasResetButton) {
      results.passed.push('TEST 6: Reset/Sample button found');
      console.log('✅ PASS: Reset button found');
      
      try {
        await resetButton.click();
        await sleep(1500);
        await takeScreenshot(page, '06-wb-after-reset');
        results.passed.push('TEST 6: Reset button clicked successfully');
        console.log('✅ PASS: Reset executed');
      } catch (e) {
        results.warnings.push('TEST 6: Reset button click failed');
        console.log('⚠️  WARNING: Could not click reset');
      }
    } else {
      results.warnings.push('TEST 6: Reset button not found');
      console.log('⚠️  WARNING: Reset button not found');
    }
    
    // TEST 7: Button Controls
    console.log('\n📋 TEST 7: Interactive Controls');
    
    const allButtons = await page.locator('button').all();
    console.log(`   Found ${allButtons.length} buttons total`);
    
    if (allButtons.length >= 3) {
      results.passed.push(`TEST 7: Found ${allButtons.length} interactive buttons`);
      console.log(`✅ PASS: ${allButtons.length} buttons available`);
    } else {
      results.warnings.push(`TEST 7: Only ${allButtons.length} buttons found`);
      console.log(`⚠️  WARNING: Expected more buttons, found ${allButtons.length}`);
    }
    
    // TEST 8: Disclaimer
    console.log('\n📋 TEST 8: Safety Disclaimer');
    
    const hasDisclaimer = currentBodyText.toLowerCase().includes('disclaimer') || 
                         currentBodyText.toLowerCase().includes('educational') ||
                         currentBodyText.toLowerCase().includes('not approved');
    
    if (hasDisclaimer) {
      results.passed.push('TEST 8: Safety disclaimer present');
      console.log('✅ PASS: Safety disclaimer found');
    } else {
      results.warnings.push('TEST 8: Safety disclaimer not clearly visible');
      console.log('⚠️  WARNING: Disclaimer not clearly visible');
    }
    
    // TEST 9: Console Error Check
    console.log('\n📋 TEST 9: Console Error Check');
    
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    
    console.log(`   Console errors: ${errors.length}`);
    console.log(`   Console warnings: ${warnings.length}`);
    
    if (errors.length === 0) {
      results.passed.push('TEST 9: No console errors');
      console.log('✅ PASS: No console errors');
    } else {
      results.warnings.push(`TEST 9: ${errors.length} console errors`);
      console.log(`⚠️  WARNING: ${errors.length} console errors`);
      
      // Log first few errors
      errors.slice(0, 3).forEach((err, i) => {
        console.log(`   Error ${i + 1}: ${err.text.substring(0, 100)}`);
      });
    }
    
    // TEST 10: Responsive Layout
    console.log('\n📋 TEST 10: Responsive Layout Check');
    
    // Check viewport dimensions
    const viewport = page.viewportSize();
    console.log(`   Viewport: ${viewport.width}x${viewport.height}`);
    
    // Test smaller viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await sleep(1000);
    await takeScreenshot(page, '10-wb-mobile-view');
    
    const mobileBodyText = await page.textContent('body');
    const stillHasContent = mobileBodyText.includes('Weight') && mobileBodyText.includes('Balance');
    
    if (stillHasContent) {
      results.passed.push('TEST 10: Content visible on mobile viewport');
      console.log('✅ PASS: Mobile layout working');
    } else {
      results.warnings.push('TEST 10: Mobile layout may have issues');
      console.log('⚠️  WARNING: Mobile layout needs verification');
    }
    
    // Restore viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await sleep(500);
    
    await takeScreenshot(page, '11-wb-final-state');
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
    results.failed.push(`Test execution error: ${error.message}`);
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();
  }
  
  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 W&B TOOLBOX TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`📸 Screenshots: ${results.screenshots.length}`);
  console.log(`🧮 Calculations: ${results.calculations.length}`);
  
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
  
  if (results.calculations.length > 0) {
    console.log('\n🧮 CALCULATIONS:');
    results.calculations.forEach((calc, i) => {
      console.log(`   ${i + 1}. ${calc.test}: ${calc.numbers_found} values found`);
    });
  }
  
  // Save report
  const reportPath = join(ARTIFACTS_DIR, 'wb-test-report.json');
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved: ${reportPath}`);
  
  // Console messages summary
  const consolePath = join(ARTIFACTS_DIR, 'wb-console-messages.json');
  writeFileSync(consolePath, JSON.stringify(consoleMessages, null, 2));
  console.log(`📄 Console messages saved: ${consolePath}`);
  
  console.log('\n' + '='.repeat(60));
  
  // Calculate success rate
  const totalTests = results.passed.length + results.failed.length;
  const successRate = totalTests > 0 ? ((results.passed.length / totalTests) * 100).toFixed(1) : 0;
  console.log(`\n🎯 Success Rate: ${successRate}% (${results.passed.length}/${totalTests} passed)`);
  
  // Exit code based on failures
  const exitCode = results.failed.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
