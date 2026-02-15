import { test, expect } from '@playwright/test';

test('Inspector should not have infinite loop when loading CSV', async ({ page }) => {
  // Track console messages to detect infinite loops
  const consoleMessages: string[] = [];
  const sliceFetchMessages: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    
    // Track SLICE FETCH EFFECT messages specifically
    if (text.includes('[SLICE FETCH EFFECT]')) {
      sliceFetchMessages.push(text);
    }
  });
  
  // Navigate to inspector
  await page.goto('/#/inspector');
  
  // Wait for Inspector menu button to be visible
  const menuButton = page.getByRole('button', { name: /^Inspector/i });
  await expect(menuButton).toBeVisible({ timeout: 5000 });
  await menuButton.click();
  
  // Wait for upload option to appear
  const uploadOption = page.getByRole('button', { name: /📤 Upload/i });
  await expect(uploadOption).toBeVisible({ timeout: 2000 });
  await uploadOption.click();
  
  // Upload CSV
  const csvContent = `Name,Age,City
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago`;
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test-data.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  });
  
  // Wait for data to be loaded by checking for the row count indicator
  // This is more deterministic than a fixed timeout
  await expect(page.locator('text=/Rows.*3/')).toBeVisible({ timeout: 5000 });
  
  // Allow a brief moment for any async effects to complete
  await page.waitForTimeout(500);
  
  // Check console logs
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`SLICE FETCH EFFECT messages: ${sliceFetchMessages.length}`);
  
  // Print unique SLICE FETCH messages
  const uniqueSliceMessages = [...new Set(sliceFetchMessages)];
  console.log(`Unique SLICE FETCH messages: ${uniqueSliceMessages.length}`);
  uniqueSliceMessages.slice(0, 10).forEach((msg, i) => {
    console.log(`  [${i+1}] ${msg}`);
  });
  
  // Assert: Should have some SLICE FETCH messages but not too many (infinite loop would be 100+)
  expect(sliceFetchMessages.length).toBeLessThan(20);
  
  // Check for "Skipped - params unchanged" messages which indicate the guard is working
  const skippedMessages = sliceFetchMessages.filter(msg => msg.includes('Skipped - params unchanged'));
  console.log(`Skipped messages (guard working): ${skippedMessages.length}`);
  
  // If there are multiple slice fetch messages, most should be skipped by the guard
  if (sliceFetchMessages.length > 5) {
    expect(skippedMessages.length).toBeGreaterThan(0);
  }
  
  console.log('✅ No infinite loop detected!');
});
