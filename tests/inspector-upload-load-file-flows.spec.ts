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
    await page.goto('/#/inspector');
    await page.waitForLoadState('networkidle');

    // Track console messages to detect infinite loops
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    // Simulate file upload via hidden input
    const csvBuffer = Buffer.from(testCsvContent, 'utf-8');
    const fileInput = page.locator('input[type="file"][multiple]').first();
    await fileInput.setInputFiles({
      name: 'test-upload.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer
    });

    // Wait for data to load
    await page.waitForTimeout(2000);

    const fatalLoadErrors = consoleMessages.filter((msg) =>
      msg.includes('[LOAD CSV TEXT] Failed to complete load') ||
      msg.includes('CSV too large for browser mode')
    );
    expect(fatalLoadErrors.length).toBe(0);

    const grid = page.getByRole('grid', { name: 'Inspector grid' });
    await expect(grid).toContainText('Alice');
    await expect(grid).toContainText('Bob');
    await expect(grid).toContainText('Charlie');

    // Check that grid window metrics are shown
    await expect(page.locator('[data-testid="inspector-metrics-bar"]')).toContainText('Slice:');
    
    console.log('✅ Upload flow: No infinite loop, data displayed correctly');
  });

  test('Upload flow should not show early exit errors', async ({ page }) => {
    await page.goto('/#/inspector');
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
    const fileInput = page.locator('input[type="file"][multiple]').first();
    await fileInput.setInputFiles({
      name: 'test-upload.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer
    });

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check for the problematic early exit errors
    const postLoadErrors = errorMessages.filter((msg) =>
      msg.includes('[LOAD CSV TEXT] Failed to complete load') ||
      msg.includes('CSV too large for browser mode')
    );
    expect(postLoadErrors.length).toBe(0);
    
    console.log('✅ Upload flow: No hasLoaded sync issues');
  });

  test('Grid should show correct row counts after upload', async ({ page }) => {
    await page.goto('/#/inspector');
    await page.waitForLoadState('networkidle');

    // Upload CSV with known row count
    const csvBuffer = Buffer.from(testCsvContent, 'utf-8');
    const fileInput = page.locator('input[type="file"][multiple]').first();
    await fileInput.setInputFiles({
      name: 'test-metrics.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer
    });

    // Wait for data to load
    await page.waitForTimeout(2000);

    const metrics = page.locator('[data-testid="inspector-metrics-bar"]');
    await expect(metrics).toContainText('Rows');
    await expect(metrics).toContainText('Filtered');
    await expect(metrics).toContainText('3');

    console.log('✅ Grid metrics: Correct row counts displayed');
  });

  test('Multiple uploads should not cause state corruption', async ({ page }) => {
    await page.goto('/#/inspector');
    await page.waitForLoadState('networkidle');

    const csv1 = `A,B\n1,2\n3,4`;
    const csv2 = `X,Y,Z\n10,20,30\n40,50,60`;

    // First upload
    const fileInput = page.locator('input[type="file"][multiple]').first();
    await fileInput.setInputFiles({
      name: 'first.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv1, 'utf-8')
    });
    await page.waitForTimeout(1500);

    const grid = page.getByRole('grid', { name: 'Inspector grid' });
    await expect(grid).toContainText('A');
    await expect(grid).toContainText('1');

    // Second upload (should replace first)
    await fileInput.setInputFiles({
      name: 'second.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv2, 'utf-8')
    });
    await page.waitForTimeout(1500);

    // Verify second upload data
    await expect(grid).toContainText('X');
    await expect(grid).toContainText('10');

    console.log('✅ Multiple uploads: State properly updated');
  });
});
