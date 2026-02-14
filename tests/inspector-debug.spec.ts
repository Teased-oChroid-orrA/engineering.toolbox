import { test, expect } from '@playwright/test';

test.describe('Inspector CSV Debug', () => {
  test('inspect page state after CSV load', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    
    await page.goto('/#/inspector');
    await page.waitForLoadState('networkidle');
    
    const csvData = `Name,Age\nAlice,30\nBob,25`;
    
    // Upload CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvData)
    });
    
    // Wait for processing
    await page.waitForTimeout(3000);
    
    // Check page state
    const pageState = await page.evaluate(() => {
      return {
        hasGridElements: document.querySelectorAll('[role="grid"]').length,
        hasGridCells: document.querySelectorAll('[role="gridcell"]').length,
        hasAnyText: document.body.innerText.includes('Alice'),
        visibleElements: Array.from(document.querySelectorAll('*'))
          .filter(el => el.textContent?.includes('Alice'))
          .map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.slice(0, 50) }))
      };
    });
    
    console.log('Page state:', JSON.stringify(pageState, null, 2));
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/inspector-debug.png', fullPage: true });
    
    // Check various possible selectors
    const selectors = [
      '[role="grid"]',
      '[role="gridcell"]',
      'table',
      '.grid',
      'text=Alice',
      '*:has-text("Alice")'
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      console.log(`Selector "${selector}": ${count} elements`);
    }
  });
});
