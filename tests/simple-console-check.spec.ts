import { test, expect } from '@playwright/test';

test('Simple console check - no errors after upload', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log('[ERROR]', text);
    } else {
      console.log(`[${msg.type().toUpperCase()}]`, text);
    }
  });

  console.log('[TEST] Navigating to Inspector...');
  await page.goto('http://127.0.0.1:5173/inspector');
  
  console.log('[TEST] Waiting for page to load...');
  await page.waitForSelector('.inspector-lab', { timeout: 10000 });
  
  console.log('[TEST] Clicking menu button...');
  await page.click('button:has-text("Inspector")');
  
  console.log('[TEST] Clicking Upload...');
  const uploadButton = page.locator('text="📤 Upload..."');
  await uploadButton.waitFor({ timeout: 5000 });
  
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    uploadButton.click()
  ]);
  
  console.log('[TEST] Uploading file...');
  await fileChooser.setFiles('/Users/nautilus/Desktop/StructuralCompanionDesktop/test-sample-1000.csv');
  
  console.log('[TEST] Waiting 3 seconds for processing...');
  await page.waitForTimeout(3000);
  
  console.log('[TEST] Checking for errors...');
  console.log('[TEST] Total errors captured:', errors.length);
  
  if (errors.length > 0) {
    console.log('[TEST] Errors found:');
    errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
  }
  
  expect(errors.length).toBe(0);
  console.log('[TEST] ✅ No console errors!');
});
