import { test, expect } from '@playwright/test';

test('Inspector menu appears on initial load', async ({ page }) => {
  await page.goto('/#/inspector');
  await page.waitForLoadState('networkidle');
  
  // Check for Inspector dropdown button
  const inspectorButton = page.getByRole('button', { name: /Inspector/i }).first();
  await expect(inspectorButton).toBeVisible({ timeout: 5000 });
  
  console.log('✅ Inspector button is visible');
  
  // Click it to open menu
  await inspectorButton.click();
  await page.waitForTimeout(500);
  
  // Check if menu items appear
  const shortcutsBtn = page.getByRole('button', { name: /Shortcuts/i }).first();
  const recipesBtn = page.getByRole('button', { name: /Recipes/i }).first();
  
  const shortcutsVisible = await shortcutsBtn.isVisible().catch(() => false);
  const recipesVisible = await recipesBtn.isVisible().catch(() => false);
  
  console.log('Shortcuts button visible:', shortcutsVisible);
  console.log('Recipes button visible:', recipesVisible);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/inspector-menu-test.png', fullPage: true });
  
  expect(shortcutsVisible || recipesVisible).toBe(true);
});
