import { test, expect } from '@playwright/test';

test.describe('Inspector Menu - Complete Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  test('Menu button should be visible and clickable', async ({ page }) => {
    const menuButton = page.locator('button:has-text("Inspector")');
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    
    // Verify menu panel appears
    const menuPanel = page.locator('text=Data').first();
    await expect(menuPanel).toBeVisible();
  });

  test('Upload CSV should open file picker', async ({ page }) => {
    // Open menu
    await page.locator('button:has-text("Inspector")').click();
    
    // Set up file chooser listener before clicking
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click Upload
    await page.locator('text=📤 Upload...').click();
    
    // Verify file chooser opened
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test('Schema Inspector modal should open', async ({ page }) => {
    await page.locator('button:has-text("Inspector")').click();
    await page.locator('text=📊 Schema Inspector').click();
    
    // Wait for modal to appear
    await page.waitForTimeout(500);
    
    // Check for schema modal content
    const schemaModal = page.locator('text=Schema Inspector').first();
    await expect(schemaModal).toBeVisible();
  });

  test('Recipes modal should open', async ({ page }) => {
    await page.locator('button:has-text("Inspector")').click();
    await page.locator('text=⚡ Recipes').click();
    
    await page.waitForTimeout(500);
    
    // Check for recipes modal
    const recipesModal = page.locator('text=Recipe').first();
    await expect(recipesModal).toBeVisible();
  });

  test('Column Picker modal should open', async ({ page }) => {
    await page.locator('button:has-text("Inspector")').click();
    await page.locator('text=🔢 Columns').click();
    
    await page.waitForTimeout(500);
    
    // Check for column picker modal
    const columnModal = page.locator('text=Column').first();
    await expect(columnModal).toBeVisible();
  });

  test('Shortcuts modal should open', async ({ page }) => {
    await page.locator('button:has-text("Inspector")').click();
    await page.locator('text=⌨️ Shortcuts').click();
    
    await page.waitForTimeout(500);
    
    // Check for shortcuts modal
    const shortcutsModal = page.locator('text=Keyboard').or(page.locator('text=Shortcut')).first();
    await expect(shortcutsModal).toBeVisible();
  });

  test('Regex Help toggle should work', async ({ page }) => {
    await page.locator('button:has-text("Inspector")').click();
    
    // Click toggle
    await page.locator('text=Regex Help').click();
    
    // Close menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Open menu again to check state changed
    await page.locator('button:has-text("Inspector")').click();
    
    // Check if checkmark appears (label changes to "✓ Regex Help")
    const regexHelpChecked = page.locator('text=✓ Regex Help');
    await expect(regexHelpChecked).toBeVisible();
  });

  test('Disabled items should not be clickable when no data loaded', async ({ page }) => {
    await page.locator('button:has-text("Inspector")').click();
    
    // These should be disabled when no data is loaded
    const advancedBuilder = page.locator('text=🔧 Advanced Builder');
    const clearFilters = page.locator('text=🗑️ Clear Filters');
    const exportCurrentView = page.locator('text=💾 Current View');
    
    await expect(advancedBuilder).toBeDisabled();
    await expect(clearFilters).toBeDisabled();
    await expect(exportCurrentView).toBeDisabled();
  });

  test('Menu sections should be properly organized', async ({ page }) => {
    await page.locator('button:has-text("Inspector")').click();
    
    // Verify all 5 sections exist
    await expect(page.locator('text=DATA')).toBeVisible();
    await expect(page.locator('text=ANALYSIS')).toBeVisible();
    await expect(page.locator('text=FILTER TOOLS')).toBeVisible();
    await expect(page.locator('text=EXPORT')).toBeVisible();
    await expect(page.locator('text=SETTINGS')).toBeVisible();
  });

  test('Menu should close when clicking outside', async ({ page }) => {
    const menuButton = page.locator('button:has-text("Inspector")');
    await menuButton.click();
    
    // Verify menu is open
    await expect(page.locator('text=DATA')).toBeVisible();
    
    // Click outside the menu
    await page.click('body', { position: { x: 10, y: 10 } });
    
    // Wait and verify menu closed
    await page.waitForTimeout(300);
    await expect(page.locator('text=DATA')).not.toBeVisible();
  });

  test('All 15 menu items should be present', async ({ page }) => {
    await page.locator('button:has-text("Inspector")').click();
    
    // Data section (2)
    await expect(page.locator('text=📂 Load File...')).toBeVisible();
    await expect(page.locator('text=📤 Upload...')).toBeVisible();
    
    // Analysis section (4)
    await expect(page.locator('text=📊 Schema Inspector')).toBeVisible();
    await expect(page.locator('text=⚡ Recipes')).toBeVisible();
    await expect(page.locator('text=🔢 Columns')).toBeVisible();
    await expect(page.locator('text=⌨️ Shortcuts')).toBeVisible();
    
    // Filter Tools section (2)
    await expect(page.locator('text=🔧 Advanced Builder')).toBeVisible();
    await expect(page.locator('text=🗑️ Clear Filters')).toBeVisible();
    
    // Export section (3)
    await expect(page.locator('text=💾 Current View')).toBeVisible();
    await expect(page.locator('text=📋 Filtered Rows')).toBeVisible();
    await expect(page.locator('text=📦 Analysis Bundle')).toBeVisible();
    
    // Settings section (4)
    await expect(page.locator('text=🔄 Refresh Schema')).toBeVisible();
    await expect(page.locator('text=Regex Help')).toBeVisible();
    await expect(page.locator('text=Quiet Logs')).toBeVisible();
    await expect(page.locator('text=Auto-restore')).toBeVisible();
  });
});

test.describe('Inspector Menu - With Data Loaded', () => {
  test('Upload and test data-dependent features', async ({ page }) => {
    // Create a sample CSV
    const csvContent = `Name,Age,City
John,30,NYC
Jane,25,LA
Bob,35,Chicago`;
    
    // Navigate to inspector
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Open menu and upload
    await page.locator('button:has-text("Inspector")').click();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('text=📤 Upload...').click();
    const fileChooser = await fileChooserPromise;
    
    // Upload the CSV
    await fileChooser.setFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Now open menu again and check if previously disabled items are enabled
    await page.locator('button:has-text("Inspector")').click();
    
    // These should now be enabled
    const advancedBuilder = page.locator('text=🔧 Advanced Builder');
    const clearFilters = page.locator('text=🗑️ Clear Filters');
    const exportCurrentView = page.locator('text=💾 Current View');
    
    await expect(advancedBuilder).toBeEnabled();
    await expect(clearFilters).toBeEnabled();
    await expect(exportCurrentView).toBeEnabled();
    
    // Test Advanced Builder opens
    await advancedBuilder.click();
    await page.waitForTimeout(500);
    
    // Should see the builder UI
    const builderModal = page.locator('text=Filter').or(page.locator('text=Builder')).first();
    await expect(builderModal).toBeVisible();
  });
});
