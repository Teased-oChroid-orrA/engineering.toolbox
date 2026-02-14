import { test } from '@playwright/test';

test('Capture all console messages', async ({ page }) => {
  const consoleLogs: any[] = [];
  const consoleErrors: any[] = [];
  const consoleWarnings: any[] = [];
  const pageErrors: any[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    
    if (type === 'error') {
      consoleErrors.push(text);
    } else if (type === 'warning') {
      consoleWarnings.push(text);
    } else {
      consoleLogs.push(text);
    }
  });
  
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });
  
  // Navigate to Inspector
  await page.goto('http://127.0.0.1:5173/#/inspector');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Upload CSV
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('button:has-text("Inspector")').first().click();
  await page.waitForTimeout(300);
  await page.locator('text=📤 Upload...').click();
  const fileChooser = await fileChooserPromise;
  
  // Use small sample instead of 244MB file
  const csvContent = `Name,Age,City,Country
John,30,NYC,USA
Jane,25,LA,USA
Bob,35,Chicago,USA`;
  
  await fileChooser.setFiles({
    name: 'test-sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  });
  
  await page.waitForTimeout(3000);
  
  // Interact with UI
  await page.locator('button:has-text("Inspector")').first().click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  
  // Output all captured messages
  console.log('\n========== CONSOLE ERRORS ==========');
  if (consoleErrors.length === 0) {
    console.log('✅ No console errors');
  } else {
    consoleErrors.forEach((err, i) => {
      console.log(`${i + 1}. ${err}`);
    });
  }
  
  console.log('\n========== CONSOLE WARNINGS ==========');
  if (consoleWarnings.length === 0) {
    console.log('✅ No console warnings');
  } else {
    consoleWarnings.forEach((warn, i) => {
      console.log(`${i + 1}. ${warn}`);
    });
  }
  
  console.log('\n========== PAGE ERRORS ==========');
  if (pageErrors.length === 0) {
    console.log('✅ No page errors');
  } else {
    pageErrors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.message}`);
      if (err.stack) console.log(`   Stack: ${err.stack.substring(0, 200)}`);
    });
  }
  
  console.log('\n========== SUMMARY ==========');
  console.log(`Total errors: ${consoleErrors.length + pageErrors.length}`);
  console.log(`Total warnings: ${consoleWarnings.length}`);
  console.log(`Total logs: ${consoleLogs.length}`);
  console.log('============================\n');
  
  // Test passes regardless - we're just collecting data
});
