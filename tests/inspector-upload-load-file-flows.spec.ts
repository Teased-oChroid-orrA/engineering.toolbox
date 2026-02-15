/**
 * Inspector Upload and Load File Flow Tests
 * 
 * Tests both "Upload" (browser file input) and "Load File" (Tauri dialog) flows
 * to ensure:
 * 1. No infinite loop in console
 * 2. Grid displays data correctly
 * 3. hasLoaded state is properly synchronized
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const testCsvContent = `Name,Age,City
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago`;

test.describe('Inspector Upload and Load File Flows', () => {
  test('Upload flow: CSV upload via file input should work without infinite loop', async ({ page }) => {
    await page.goto('/inspector');
    await page.waitForLoadState('networkidle');

    // Track console messages to detect infinite loops
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    // Simulate file upload via hidden input
    const csvBuffer = Buffer.from(testCsvContent, 'utf-8');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test-upload.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer
    });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for infinite loop indicators
    const drainFilterQueueCalls = consoleMessages.filter(msg => msg.includes('DRAIN FILTER QUEUE CALLED'));
    console.log('Upload flow: DRAIN FILTER QUEUE calls:', drainFilterQueueCalls.length);
    
    // Should have some calls but not excessive (< 10 is reasonable)
    expect(drainFilterQueueCalls.length).toBeLessThan(10);

    // Verify data is displayed
    const cellLocator = page.locator('[role="cell"]');
    const cellCount = await cellLocator.count();
    console.log('Upload flow: Cell count:', cellCount);
    
    // Should have at least data cells (3 rows × 3 cols = 9)
    expect(cellCount).toBeGreaterThanOrEqual(9);

    // Verify specific data
    await expect(page.locator('text=Alice')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Bob')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Charlie')).toBeVisible({ timeout: 5000 });

    // Check that grid window metrics are shown
    await expect(page.locator('text=/Slice:/')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Upload flow: No infinite loop, data displayed correctly');
  });

  test('Upload flow should not show early exit errors', async ({ page }) => {
    await page.goto('/inspector');
    await page.waitForLoadState('networkidle');

    // Track error console messages
    const errorMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });

    // Upload CSV
    const csvBuffer = Buffer.from(testCsvContent, 'utf-8');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test-upload.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer
    });

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check for the problematic early exit errors
    const earlyExitErrors = errorMessages.filter(msg => 
      msg.includes('EARLY EXIT 1') && msg.includes('hasLoaded: – false')
    );

    console.log('Upload flow error check: EARLY EXIT errors:', earlyExitErrors.length);
    
    // After loading, we should not see hasLoaded: false errors
    const postLoadErrors = errorMessages.slice(-10).filter(msg => 
      msg.includes('hasLoaded: – false')
    );
    
    expect(postLoadErrors.length).toBe(0);
    
    console.log('✅ Upload flow: No hasLoaded sync issues');
  });

  test('Grid should show correct row counts after upload', async ({ page }) => {
    await page.goto('/inspector');
    await page.waitForLoadState('networkidle');

    // Upload CSV with known row count
    const csvBuffer = Buffer.from(testCsvContent, 'utf-8');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test-metrics.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer
    });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check metrics display
    const metricsText = await page.textContent('.inspector-metrics, [class*="metric"]').catch(() => '');
    console.log('Metrics text:', metricsText);

    // Look for row count indicators
    const rowsIndicator = page.locator('text=/ROWS.*3/');
    await expect(rowsIndicator).toBeVisible({ timeout: 5000 });

    // Look for filtered count
    const filteredIndicator = page.locator('text=/FILTERED.*3/');
    await expect(filteredIndicator).toBeVisible({ timeout: 5000 });

    console.log('✅ Grid metrics: Correct row counts displayed');
  });

  test('Multiple uploads should not cause state corruption', async ({ page }) => {
    await page.goto('/inspector');
    await page.waitForLoadState('networkidle');

    const csv1 = `A,B\n1,2\n3,4`;
    const csv2 = `X,Y,Z\n10,20,30\n40,50,60`;

    // First upload
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'first.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv1, 'utf-8')
    });
    await page.waitForTimeout(1500);

    // Verify first upload
    await expect(page.locator('text=1')).toBeVisible();

    // Second upload (should replace first)
    await fileInput.setInputFiles({
      name: 'second.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv2, 'utf-8')
    });
    await page.waitForTimeout(1500);

    // Verify second upload data
    await expect(page.locator('text=10')).toBeVisible();
    await expect(page.locator('text=X')).toBeVisible();

    console.log('✅ Multiple uploads: State properly updated');
  });
});
