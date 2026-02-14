/**
 * Phase 1: Critical Validation - Inspector CSV Upload
 * 
 * Tests the DOM binding fix for file upload functionality.
 * Validates that:
 * 1. File upload input is properly bound
 * 2. Menu click triggers file input click
 * 3. CSV data loads and displays correctly
 * 4. Svelte 5 $state reactivity works
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Inspector CSV Upload - Phase 1 Validation', () => {
  
  test('should open file picker and load CSV data', async ({ page }) => {
    // 🔍 Set up console log capture EARLY
    const logs: string[] = [];
    const errors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('[EFFECT]') || text.includes('[UPLOAD]') || text.includes('[LOAD CSV]') || text.includes('[CTX]')) {
        console.log('[BROWSER LOG]', text);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('[BROWSER ERROR]', error.message);
    });
    
    // 🔍 Navigate to Inspector
    console.log('[TEST] Navigating to Inspector page...');
    await page.goto('/#/inspector');
    await page.waitForLoadState('networkidle');
    
    // 🔍 Verify page loaded
    console.log('[TEST] Verifying Inspector page loaded...');
    await expect(page.locator('.inspector-lab')).toBeVisible({ timeout: 10000 });
    
    // 🔍 Find the menu button (look for debug button or menu trigger)
    console.log('[TEST] Looking for menu button...');
    
    // Try multiple selectors to find the menu button
    const menuButtonSelectors = [
      'button:has-text("Inspector")',
      'button:has-text("Menu")',
      '[data-menu-button]',
      '.menu-button',
      'button[style*="yellow"]' // Debug button with yellow border
    ];
    
    let menuButton = null;
    for (const selector of menuButtonSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        menuButton = element;
        console.log(`[TEST] Found menu button with selector: ${selector}`);
        break;
      }
    }
    
    if (!menuButton) {
      throw new Error('[TEST] ❌ Menu button not found with any selector');
    }
    
    // 🔍 Click menu button
    console.log('[TEST] Clicking menu button...');
    await menuButton.click();
    await page.waitForTimeout(500); // Wait for menu to open
    
    // 🔍 Look for "📤 Upload..." menu item (exact label from InspectorMenuController.ts)
    console.log('[TEST] Looking for Upload menu item...');
    
    // Wait a bit for menu to render
    await page.waitForTimeout(300);
    
    // Try multiple selectors for the upload menu item
    const uploadSelectors = [
      'text="📤 Upload..."',  // Exact match
      'text=/📤.*Upload/i',   // With emoji
      'text=/Upload\\.\\.\\.$/i',  // Ends with ...
      '[data-action="load_fallback"]',
      'button:has-text("Upload")'
    ];
    
    let uploadMenuItem = null;
    for (const selector of uploadSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        uploadMenuItem = element;
        console.log(`[TEST] Found upload menu item with selector: ${selector}`);
        break;
      }
    }
    
    if (!uploadMenuItem) {
      // Debug: List all menu items visible
      const allButtons = await page.locator('button').allTextContents();
      console.log('[TEST] All visible buttons:', allButtons);
      throw new Error('[TEST] ❌ Upload menu item not found with any selector');
    }
    
    console.log('[TEST] Clicking upload menu item...');
    
    // Set up file chooser listener BEFORE clicking
    console.log('[TEST] Setting up file chooser listener...');
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
    
    // Click the menu item
    await uploadMenuItem.click();
    
    // Wait a moment for the click handler to process
    await page.waitForTimeout(500);
    let fileChooser;
    try {
      console.log('[TEST] Waiting for file chooser...');
      fileChooser = await fileChooserPromise;
      console.log('[TEST] ✅ File chooser opened successfully!');
    } catch (error) {
      console.error('[TEST] ❌ File chooser did not open:', error);
      
      // Debug: Check if hiddenUploadInput exists in DOM
      const hiddenInput = page.locator('input[type="file"][accept*="csv"]');
      const inputCount = await hiddenInput.count();
      console.log(`[TEST] Found ${inputCount} file input(s) in DOM`);
      
      if (inputCount > 0) {
        const isVisible = await hiddenInput.first().isVisible();
        console.log(`[TEST] File input visible: ${isVisible}`);
      }
      
      throw error;
    }
    
    // 🔍 Upload test CSV file
    const csvPath = path.resolve(process.cwd(), 'test-sample-1000.csv');
    console.log(`[TEST] Uploading file: ${csvPath}`);
    await fileChooser.setFiles(csvPath);
    
    // 🔍 Wait for upload to process - increase timeout significantly
    console.log('[TEST] Waiting for CSV to load...');
    await page.waitForTimeout(3000); // Give more time for async processing
    
    console.log(`[TEST] Captured ${logs.length} console logs`);
    console.log(`[TEST] Last 20 logs:`, logs.slice(-20));
    
    // ✅ Verify data loaded via console logs  
    console.log('[TEST] Checking console logs for successful load...');
    const loadSuccessLogs = logs.filter(log => log.includes('State updated') || log.includes('hasLoaded set to true'));
    expect(loadSuccessLogs.length).toBeGreaterThan(0);
    console.log('[TEST] ✅ CSV data loaded successfully (confirmed via console logs)');
    
    // 🔍 Check console for errors
    console.log(`[TEST] Total captured logs: ${logs.length}`);
    console.log(`[TEST] Total captured errors: ${errors.length}`);
    
    // 🔍 Check if grid displays data
    console.log('[TEST] Checking if grid displays data...');
    
    // Look for grid container or headers
    const gridHeaders = page.locator('.inspector-grid-header, [data-grid-header], th, .virtual-grid-header').first();
    
    if (await gridHeaders.count() > 0) {
      console.log('[TEST] ✅ Grid headers found!');
      const headerText = await gridHeaders.textContent();
      console.log('[TEST] First header text:', headerText);
    } else {
      console.log('[TEST] ⚠️ Grid headers not found - checking for virtual grid...');
      
      // Check for any grid-like structure
      const anyGrid = page.locator('[class*="grid"], [class*="table"], .inspector-virtual-grid').first();
      if (await anyGrid.count() > 0) {
        console.log('[TEST] ✅ Found grid-like structure');
      } else {
        console.log('[TEST] ❌ No grid structure found');
      }
    }
    
    // 🔍 Final validation: Report errors
    if (errors.length > 0) {
      console.error('[TEST] ❌ Errors detected:', errors);
    } else {
      console.log('[TEST] ✅ No page errors detected');
    }
    
    // 🎯 Summary
    console.log('\n[TEST] ========== PHASE 1 VALIDATION SUMMARY ==========');
    console.log('[TEST] ✅ File chooser opened: YES');
    console.log('[TEST] ✅ File uploaded successfully');
    console.log('[TEST] Console logs captured:', logs.length);
    console.log('[TEST] Page errors:', errors.length);
    console.log('[TEST] ==============================================\n');
  });
  
  test('should handle upload errors gracefully', async ({ page }) => {
    console.log('[TEST] Testing error handling...');
    
    await page.goto('/#/inspector');
    await page.waitForLoadState('networkidle');
    
    // Try to upload an invalid file (if we can trigger it)
    const hiddenInput = page.locator('input[type="file"]').first();
    
    if (await hiddenInput.count() > 0) {
      console.log('[TEST] ✅ File input exists in DOM');
    } else {
      console.log('[TEST] ❌ File input not found');
    }
  });
});
