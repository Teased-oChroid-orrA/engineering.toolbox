import { test, expect } from '@playwright/test';

test('Inspector infinite loop debug - CSV upload', async ({ page }) => {
  // Track slice fetch effect calls
  const sliceFetchCalls: any[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[SLICE FETCH EFFECT]')) {
      sliceFetchCalls.push({ 
        timestamp: Date.now(), 
        text: text 
      });
      console.log(`[TEST LOG] ${text}`);
    }
    if (text.includes('[DRAIN FILTER QUEUE CALLED]')) {
      console.log(`[TEST LOG] ${text}`);
    }
    if (text.includes('[FILTER PASS]')) {
      console.log(`[TEST LOG] ${text}`);
    }
    if (text.includes('[FETCH SLICE]')) {
      console.log(`[TEST LOG] ${text}`);
    }
  });

  // Navigate to Inspector
  await page.goto('http://127.0.0.1:5173/#/inspector');
  await page.waitForLoadState('networkidle');
  
  // Wait for UI to be ready
  await page.waitForSelector('text=Query & Filter Controls', { timeout: 10000 });
  
  console.log('\n[TEST] Creating CSV content...');
  const csvContent = 'Name,Age,City\nAlice,30,NYC\nBob,25,LA\nCharlie,35,Chicago';
  
  // Upload CSV via file input
  console.log('[TEST] Uploading CSV...');
  const fileInputSelector = 'input[type="file"][accept*=".csv"]';
  const fileInput = await page.locator(fileInputSelector);
  
  // Create a file-like object
  const buffer = Buffer.from(csvContent);
  await fileInput.setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: buffer
  });
  
  // Wait a bit for processing
  console.log('[TEST] Waiting for CSV to load...');
  await page.waitForTimeout(3000);
  
  // Check for data display
  console.log('[TEST] Checking for data display...');
  const gridVisible = await page.locator('text=Alice').isVisible({ timeout: 5000 }).catch(() => false);
  
  console.log(`[TEST] Grid data visible: ${gridVisible}`);
  console.log(`[TEST] Total slice fetch effect calls: ${sliceFetchCalls.length}`);
  
  // Log all calls
  sliceFetchCalls.forEach((call, idx) => {
    console.log(`[TEST] Call ${idx + 1}: ${call.text}`);
  });
  
  // Check for infinite loop (more than 10 calls would be suspicious)
  if (sliceFetchCalls.length > 10) {
    console.error(`[TEST] ❌ INFINITE LOOP DETECTED: ${sliceFetchCalls.length} calls`);
    expect(sliceFetchCalls.length).toBeLessThanOrEqual(10);
  } else {
    console.log(`[TEST] ✅ No infinite loop: ${sliceFetchCalls.length} calls`);
  }
  
  // Verify data is displayed
  expect(gridVisible).toBe(true);
});
