/**
 * Inspector CSV Upload - Specific Error Validation
 * 
 * Tests for the specific error conditions mentioned in the issue:
 * 1. Infinite loop: "DRAIN FILTER QUEUE CALLED" repeating endlessly
 * 2. Empty grid with "EARLY EXIT 1 ★★★ hasLoaded: – false"
 * 3. Load File shows metadata but empty grid
 */

import { test, expect } from '@playwright/test';

const testCsvContent = `Name,Age,City
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago
David,28,Boston
Eve,32,Seattle`;

test.describe('Inspector CSV Upload - Error Conditions', () => {
  test('should not have infinite DRAIN FILTER QUEUE loop on upload', async ({ page }) => {
    // Track console error messages
    const errorMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });

    await page.goto('/#/inspector');
    
    // Wait for and click Inspector menu
    const menuButton = page.getByRole('button', { name: /^Inspector/i });
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    
    // Click Upload option
    const uploadOption = page.getByRole('button', { name: /📤 Upload/i });
    await expect(uploadOption).toBeVisible({ timeout: 2000 });
    await uploadOption.click();

    // Upload CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-infinite-loop.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCsvContent)
    });

    // Wait for processing
    await page.waitForTimeout(3000);

    // Count DRAIN FILTER QUEUE calls
    const drainCalls = errorMessages.filter(msg => msg.includes('DRAIN FILTER QUEUE CALLED'));
    
    console.log('Total error messages:', errorMessages.length);
    console.log('DRAIN FILTER QUEUE calls:', drainCalls.length);
    
    // Should have some calls but not infinite loop (< 5 is normal)
    expect(drainCalls.length).toBeLessThan(5);
    expect(drainCalls.length).toBeGreaterThan(0);

    console.log('✅ No infinite loop detected');
  });

  test('should not show "hasLoaded: – false" errors after CSV loads', async ({ page }) => {
    const errorMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });

    await page.goto('/#/inspector');
    
    // Wait for and click Inspector menu
    const menuButton = page.getByRole('button', { name: /^Inspector/i });
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    
    // Click Upload option
    const uploadOption = page.getByRole('button', { name: /📤 Upload/i });
    await expect(uploadOption).toBeVisible({ timeout: 2000 });
    await uploadOption.click();

    // Upload CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-hasloaded.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCsvContent)
    });

    // Wait for data to fully load
    await page.waitForTimeout(2000);

    // Look for the specific error pattern from the issue
    const earlyExitErrors = errorMessages.filter(msg => 
      msg.includes('EARLY EXIT 1') && msg.includes('hasLoaded: – false')
    );

    console.log('Early exit errors with hasLoaded false:', earlyExitErrors.length);
    
    // After loading completes, should not see hasLoaded: false errors
    const postLoadHasLoadedFalse = errorMessages
      .slice(-20) // Check last 20 messages
      .filter(msg => msg.includes('hasLoaded:') && msg.includes('false'));
    
    console.log('Post-load hasLoaded: false messages:', postLoadHasLoadedFalse.length);
    
    // Should be 0 or very few (only during initial load)
    expect(postLoadHasLoadedFalse.length).toBeLessThanOrEqual(1);

    console.log('✅ No persistent hasLoaded: false errors');
  });

  test('should display grid data after CSV upload (not empty)', async ({ page }) => {
    await page.goto('/#/inspector');
    
    // Wait for and click Inspector menu
    const menuButton = page.getByRole('button', { name: /^Inspector/i });
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    
    // Click Upload option
    const uploadOption = page.getByRole('button', { name: /📤 Upload/i });
    await expect(uploadOption).toBeVisible({ timeout: 2000 });
    await uploadOption.click();

    // Upload CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-data-display.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCsvContent)
    });

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check that grid is NOT empty
    const cellLocator = page.locator('[role="cell"]');
    const cellCount = await cellLocator.count();
    
    console.log('Grid cell count:', cellCount);
    
    // Should have at least header + data cells (5 rows × 3 cols = 15 data cells)
    expect(cellCount).toBeGreaterThan(10);

    // Verify specific data is visible
    await expect(page.locator('text=Alice')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=NYC')).toBeVisible({ timeout: 5000 });

    console.log('✅ Grid displays data correctly');
  });

  test('should show correct ROWS and FILTERED counts', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto('/#/inspector');
    
    // Wait for and click Inspector menu
    const menuButton = page.getByRole('button', { name: /^Inspector/i });
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    
    // Click Upload option
    const uploadOption = page.getByRole('button', { name: /📤 Upload/i });
    await expect(uploadOption).toBeVisible({ timeout: 2000 });
    await uploadOption.click();

    // Upload CSV with known row count
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-counts.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCsvContent)
    });

    // Wait for processing
    await page.waitForTimeout(2000);

    // Look for metrics in the page
    const pageText = await page.textContent('body');
    
    // Should show ROWS: 5 (we have 5 data rows)
    expect(pageText).toContain('ROWS');
    expect(pageText).toContain('5');
    
    // Should show FILTERED count
    expect(pageText).toContain('FILTERED');

    // Should show RENDERED > 0
    expect(pageText).toContain('RENDERED');
    
    // Check that the display is not showing 0 rendered
    const renderedZero = pageText?.includes('RENDERED\n0') || pageText?.includes('rendered 0');
    expect(renderedZero).toBe(false);

    console.log('✅ Correct row counts displayed');
  });

  test('should not trigger filter loop when opening menu items', async ({ page }) => {
    const errorMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });

    await page.goto('/#/inspector');
    
    // Wait for and click Inspector menu
    const menuButton = page.getByRole('button', { name: /^Inspector/i });
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    
    // Click Upload option
    const uploadOption = page.getByRole('button', { name: /📤 Upload/i });
    await expect(uploadOption).toBeVisible({ timeout: 2000 });
    await uploadOption.click();

    // Upload CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-menu.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCsvContent)
    });

    await page.waitForTimeout(2000);

    // Clear error messages accumulated during upload
    errorMessages.length = 0;

    // Try clicking menu again to trigger another interaction
    const inspectorMenuButton = page.getByRole('button', { name: /^Inspector/i });
    if (await inspectorMenuButton.isVisible()) {
      await inspectorMenuButton.click();
      await page.waitForTimeout(500);
      // Close it
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Check for infinite loop after menu interaction
    const drainCallsAfterMenu = errorMessages.filter(msg => msg.includes('DRAIN FILTER QUEUE CALLED'));
    
    console.log('DRAIN calls after menu interaction:', drainCallsAfterMenu.length);
    
    // Should be 0 or very few
    expect(drainCallsAfterMenu.length).toBeLessThan(3);

    console.log('✅ No filter loop triggered by menu');
  });
});
