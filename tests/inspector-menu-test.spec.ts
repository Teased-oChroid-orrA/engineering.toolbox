import { test, expect } from '@playwright/test';

test('Inspector menu should be visible and functional', async ({ page }) => {
  // Collect console logs and errors
  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];
  
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    pageErrors.push(`[PAGE ERROR] ${error.message}\n${error.stack}`);
  });
  
  // Navigate to Inspector (using hash routing)
  console.log('Navigating to /#/inspector...');
  await page.goto('http://127.0.0.1:5173/#/inspector');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  console.log('Page loaded');
  
  // Wait a bit for effects to run
  await page.waitForTimeout(3000);
  
  // Print all console logs
  console.log('\n========== CONSOLE LOGS ==========');
  if (consoleLogs.length === 0) {
    console.log('(No console logs captured)');
  } else {
    consoleLogs.forEach(log => console.log(log));
  }
  console.log('==================================\n');
  
  // Print errors
  if (pageErrors.length > 0) {
    console.log('\n========== PAGE ERRORS ==========');
    pageErrors.forEach(err => console.log(err));
    console.log('=================================\n');
  }
  
  // Check HTML structure
  const bodyHTML = await page.evaluate(() => {
    return document.body.innerHTML.substring(0, 500);
  });
  console.log('Body HTML (first 500 chars):', bodyHTML);
  
  // Check for the Inspector menu button
  const menuButton = page.locator('button:has-text("Inspector")');
  const menuExists = await menuButton.count() > 0;
  
  console.log(`\nInspector menu button found: ${menuExists}`);
  
  if (menuExists) {
    // Try to click it
    await menuButton.click();
    
    // Wait for menu to open
    await page.waitForTimeout(500);
    
    // Check if menu items are visible
    const loadFileItem = page.locator('text=Load File');
    const uploadItem = page.locator('text=Upload');
    
    console.log(`Load File menu item visible: ${await loadFileItem.isVisible()}`);
    console.log(`Upload menu item visible: ${await uploadItem.isVisible()}`);
  } else {
    // Check what buttons ARE present
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons found: ${allButtons.length}`);
    
    for (const btn of allButtons.slice(0, 10)) {
      const text = await btn.textContent();
      console.log(`  Button: "${text}"`);
    }
  }
  
  // Check window registry
  const registry = await page.evaluate(() => {
    return (window as any).__scContextMenuRegistry__;
  });
  
  console.log('\nWindow registry:', JSON.stringify(registry, null, 2));
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/inspector-menu-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved to test-results/inspector-menu-screenshot.png');
  
  // Expect the menu to exist
  expect(menuExists).toBe(true);
});

