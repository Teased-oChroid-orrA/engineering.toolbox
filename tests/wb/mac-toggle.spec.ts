/**
 * E2E Test: Weight & Balance MAC Toggle
 * 
 * Tests the Station/%MAC display toggle functionality across:
 * - Chart axis labels and tick formatting
 * - Current CG position label
 * - Forward/aft limit line labels
 * - Edit Envelope dialog display values
 */

import { test, expect } from '@playwright/test';

test.describe('W&B MAC Toggle E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/weight-balance');
    await page.waitForLoadState('networkidle');
  });
  
  test('should show Station/%MAC toggle when MAC data exists', async ({ page }) => {
    // Open MAC configuration
    await page.click('button:has-text("⚙️ MAC")');
    await page.waitForSelector('text=MAC Configuration');
    
    // Enter MAC data
    await page.fill('input[placeholder*="LEMAC"]', '95.5');
    await page.fill('input[placeholder*="MAC"]', '59.4');
    await page.click('button:has-text("Save MAC Config")');
    
    // Wait for dialog to close
    await page.waitForTimeout(500);
    
    // Toggle button should be visible
    await expect(page.locator('button:has-text("📏 Station")')).toBeVisible();
  });
  
  test('should toggle display mode and update chart axis label', async ({ page }) => {
    // Configure MAC
    await page.click('button:has-text("⚙️ MAC")');
    await page.fill('input[placeholder*="LEMAC"]', '95.5');
    await page.fill('input[placeholder*="MAC"]', '59.4');
    await page.click('button:has-text("Save MAC Config")');
    await page.waitForTimeout(500);
    
    // Check initial state - station mode
    const chartContainer = page.locator('.bg-slate-900').first();
    await expect(chartContainer).toBeVisible();
    
    // Initially should show station units in axis
    const svgContent = await chartContainer.locator('svg').innerHTML();
    expect(svgContent).toContain('inches aft of datum');
    
    // Toggle to %MAC mode
    await page.click('button:has-text("📏 Station")');
    await page.waitForTimeout(500);
    
    // Button should update
    await expect(page.locator('button:has-text("📐 %MAC")')).toBeVisible();
    
    // Chart axis should update to %MAC
    const svgContentMAC = await chartContainer.locator('svg').innerHTML();
    expect(svgContentMAC).toContain('% MAC');
  });
  
  test('should show aria-pressed attribute on toggle button', async ({ page }) => {
    // Configure MAC
    await page.click('button:has-text("⚙️ MAC")');
    await page.fill('input[placeholder*="LEMAC"]', '95.5');
    await page.fill('input[placeholder*="MAC"]', '59.4');
    await page.click('button:has-text("Save MAC Config")');
    await page.waitForTimeout(500);
    
    const toggleButton = page.locator('button:has-text("📏 Station")');
    
    // Should have aria-pressed="false" initially
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    
    // Toggle
    await toggleButton.click();
    await page.waitForTimeout(300);
    
    const toggleButtonMAC = page.locator('button:has-text("📐 %MAC")');
    // Should have aria-pressed="true" after toggle
    await expect(toggleButtonMAC).toHaveAttribute('aria-pressed', 'true');
  });
  
  test('should show helper text in Edit Envelope dialog when MAC mode active', async ({ page }) => {
    // Configure MAC
    await page.click('button:has-text("⚙️ MAC")');
    await page.fill('input[placeholder*="LEMAC"]', '95.5');
    await page.fill('input[placeholder*="MAC"]', '59.4');
    await page.click('button:has-text("Save MAC Config")');
    await page.waitForTimeout(500);
    
    // Toggle to %MAC mode
    await page.click('button:has-text("📏 Station")');
    await page.waitForTimeout(300);
    
    // Open Edit Envelope dialog (click on one of the envelopes in the list)
    await page.click('button:has-text("Edit Envelope")');
    await page.waitForSelector('text=Edit W&B Envelope');
    
    // Should show helper text about MAC display
    await expect(page.locator('text=%MAC Display Active')).toBeVisible();
    await expect(page.locator('text=Inputs below are in station units')).toBeVisible();
  });
  
  test('should display %MAC conversion hints in Edit Envelope inputs', async ({ page }) => {
    // Configure MAC
    await page.click('button:has-text("⚙️ MAC")');
    await page.fill('input[placeholder*="LEMAC"]', '95.5');
    await page.fill('input[placeholder*="MAC"]', '59.4');
    await page.click('button:has-text("Save MAC Config")');
    await page.waitForTimeout(500);
    
    // Toggle to %MAC mode
    await page.click('button:has-text("📏 Station")');
    await page.waitForTimeout(300);
    
    // Open Edit Envelope dialog
    await page.click('button:has-text("Edit Envelope")');
    await page.waitForSelector('text=Edit W&B Envelope');
    
    // Labels should show % MAC
    await expect(page.locator('label:has-text("Forward Limit (% MAC)")')).toBeVisible();
    await expect(page.locator('label:has-text("Aft Limit (% MAC)")')).toBeVisible();
    
    // Should show display conversion hints if values exist
    // (The Cessna 172S sample has forward/aft limits defined)
    const displayHints = page.locator('text=Display:');
    const count = await displayHints.count();
    expect(count).toBeGreaterThan(0);
  });
  
  test('should update chart when toggling between modes multiple times', async ({ page }) => {
    // Configure MAC
    await page.click('button:has-text("⚙️ MAC")');
    await page.fill('input[placeholder*="LEMAC"]', '95.5');
    await page.fill('input[placeholder*="MAC"]', '59.4');
    await page.click('button:has-text("Save MAC Config")');
    await page.waitForTimeout(500);
    
    const chartContainer = page.locator('.bg-slate-900').first();
    
    // Toggle to %MAC
    await page.click('button:has-text("📏 Station")');
    await page.waitForTimeout(300);
    let svg1 = await chartContainer.locator('svg').innerHTML();
    expect(svg1).toContain('% MAC');
    
    // Toggle back to station
    await page.click('button:has-text("📐 %MAC")');
    await page.waitForTimeout(300);
    let svg2 = await chartContainer.locator('svg').innerHTML();
    expect(svg2).toContain('inches aft of datum');
    
    // Toggle to %MAC again
    await page.click('button:has-text("📏 Station")');
    await page.waitForTimeout(300);
    let svg3 = await chartContainer.locator('svg').innerHTML();
    expect(svg3).toContain('% MAC');
  });
  
  test('should show current CG position in correct units', async ({ page }) => {
    // Configure MAC
    await page.click('button:has-text("⚙️ MAC")');
    await page.fill('input[placeholder*="LEMAC"]', '95.5');
    await page.fill('input[placeholder*="MAC"]', '59.4');
    await page.click('button:has-text("Save MAC Config")');
    await page.waitForTimeout(500);
    
    const chartContainer = page.locator('.bg-slate-900').first();
    
    // In station mode, should show inches
    let svgStation = await chartContainer.locator('svg').innerHTML();
    // CG label format: "XXXX lbs @ XX.XX""
    expect(svgStation).toMatch(/\d+ lbs @ \d+\.\d+&quot;/);
    
    // Toggle to %MAC
    await page.click('button:has-text("📏 Station")');
    await page.waitForTimeout(300);
    
    // In MAC mode, should show % MAC
    let svgMAC = await chartContainer.locator('svg').innerHTML();
    // CG label format: "XXXX lbs @ XX.X% MAC"
    expect(svgMAC).toMatch(/\d+ lbs @ \d+\.\d+% MAC/);
  });
});
