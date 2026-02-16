import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const TEST_CSV_DATA = `Name,Age,City,Department,Salary
John Doe,30,New York,Engineering,75000
Jane Smith,28,Los Angeles,Marketing,65000
Bob Johnson,35,Chicago,Engineering,80000
Alice Williams,32,Houston,Sales,70000
Charlie Brown,29,Phoenix,Engineering,72000
Diana Prince,31,Philadelphia,Marketing,68000
Eve Davis,27,San Antonio,Sales,62000
Frank Miller,33,San Diego,Engineering,78000
Grace Lee,30,Dallas,Marketing,67000
Henry Wilson,34,San Jose,Sales,71000`;

// Use environment variable or default to localhost
const BASE_URL = process.env.INSPECTOR_URL || 'http://127.0.0.1:5173';

// Create cross-platform temp file path
const getTempCsvPath = () => join(tmpdir(), 'test-data.csv');

test.describe('Inspector Query Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to inspector
    await page.goto(`${BASE_URL}/#/inspector`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Give app time to initialize
  });

  test('should load CSV data from text', async ({ page }) => {
    console.log('Testing CSV load from text...');
    
    // Check if the page loaded
    await expect(page.locator('text=Load a CSV to begin')).toBeVisible({ timeout: 10000 });
    
    // Find the file input (hidden) and set files using setInputFiles with a buffer
    // Since we can't directly paste text, we'll need to create a temp file
    const tempCsvPath = getTempCsvPath();
    writeFileSync(tempCsvPath, TEST_CSV_DATA);
    
    // Look for the file input element
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempCsvPath);
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check if headers are visible
    await expect(page.locator('text=Name')).toBeVisible({ timeout: 10000 });
    
    console.log('CSV loaded successfully');
  });

  test('should filter rows based on query - fuzzy match', async ({ page }) => {
    console.log('Testing fuzzy query filtering...');
    
    // Load CSV first
    const tempCsvPath = getTempCsvPath();
    writeFileSync(tempCsvPath, TEST_CSV_DATA);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempCsvPath);
    await page.waitForTimeout(2000);
    
    // Get the query input field
    const queryInput = page.locator('input[placeholder*="query" i], input[aria-label*="query" i]').first();
    
    // Type a query
    await queryInput.fill('Engineering');
    await page.waitForTimeout(1000); // Wait for debounce
    
    // Check that filtered count shows correct number (should be 4 engineers)
    // The footer should show filtered count
    const footerStats = page.locator('text=/Filtered: \\d+/i');
    await expect(footerStats).toContainText('4', { timeout: 5000 });
    
    console.log('Fuzzy filtering works!');
  });

  test('should filter rows based on query - exact match', async ({ page }) => {
    console.log('Testing exact query filtering...');
    
    // Load CSV
    const tempCsvPath = getTempCsvPath();
    writeFileSync(tempCsvPath, TEST_CSV_DATA);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempCsvPath);
    await page.waitForTimeout(2000);
    
    // Switch to exact mode
    const matchModeSelect = page.locator('select, [role="combobox"]').filter({ hasText: /match|mode/i }).first();
    await matchModeSelect.selectOption('exact');
    
    // Type exact query
    const queryInput = page.locator('input[placeholder*="query" i]').first();
    await queryInput.fill('Engineering');
    await page.waitForTimeout(1000);
    
    // Should still find Engineering rows
    const footerStats = page.locator('text=/Filtered: \\d+/i');
    await expect(footerStats).toContainText('4', { timeout: 5000 });
    
    console.log('Exact matching works!');
  });

  test('should show all rows when query is cleared', async ({ page }) => {
    console.log('Testing clear query...');
    
    // Load CSV
    const tempCsvPath = getTempCsvPath();
    writeFileSync(tempCsvPath, TEST_CSV_DATA);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempCsvPath);
    await page.waitForTimeout(2000);
    
    // Type a query
    const queryInput = page.locator('input[placeholder*="query" i]').first();
    await queryInput.fill('Engineering');
    await page.waitForTimeout(1000);
    
    // Clear query
    await queryInput.clear();
    await page.waitForTimeout(1000);
    
    // Should show all 10 rows
    const footerStats = page.locator('text=/Filtered: \\d+/i');
    await expect(footerStats).toContainText('10', { timeout: 5000 });
    
    console.log('Clear query works!');
  });

  test('should take screenshots of inspector states', async ({ page }) => {
    console.log('Capturing inspector screenshots...');
    
    // Initial state
    await page.screenshot({ path: join(tmpdir(), 'inspector-initial.png'), fullPage: true });
    
    // Load CSV
    const tempCsvPath = getTempCsvPath();
    writeFileSync(tempCsvPath, TEST_CSV_DATA);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempCsvPath);
    await page.waitForTimeout(2000);
    
    // Data loaded state
    await page.screenshot({ path: join(tmpdir(), 'inspector-loaded.png'), fullPage: true });
    
    // Filter applied state
    const queryInput = page.locator('input[placeholder*="query" i]').first();
    await queryInput.fill('Engineering');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(tmpdir(), 'inspector-filtered.png'), fullPage: true });
    
    console.log('Screenshots captured');
  });
});
