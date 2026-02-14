import { test, expect } from '@playwright/test';

test('Inspector menu debug - check window registry', async ({ page }) => {
  console.log('Navigating to inspector page...');
  await page.goto('/#/inspector');
  
  // Wait for page to fully load
  await page.waitForTimeout(3000);
  
  // Check window registry directly
  const registryContents = await page.evaluate(() => {
    const registry = (window as any).__scContextMenuRegistry__;
    return registry;
  });
  
  console.log('Window registry contents:', JSON.stringify(registryContents, null, 2));
  
  // Check if menu button exists
  const menuButton = page.getByRole('button', { name: /Inspector|Menu/i });
  const buttonCount = await menuButton.count();
  console.log(`Menu button count: ${buttonCount}`);
  
  if (buttonCount === 0) {
    // Get all buttons on page
    const allButtons = await page.locator('button').all();
    console.log(`\nTotal buttons on page: ${allButtons.length}`);
    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const text = await allButtons[i].textContent();
      const visible = await allButtons[i].isVisible();
      console.log(`Button ${i}: "${text}" (visible: ${visible})`);
    }
  }
  
  expect(registryContents).toBeDefined();
  expect(registryContents.inspector).toBeDefined();
  expect(buttonCount).toBeGreaterThan(0);
});
