import { test } from '@playwright/test';

test('Debug - what does the page show?', async ({ page }) => {
  const allLogs: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    allLogs.push(`[${msg.type().toUpperCase()}] ${text}`);
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
    allLogs.push(`[PAGE ERROR] ${err.message}`);
  });

  console.log('[TEST] Navigating...');
  await page.goto('http://127.0.0.1:5173/inspector');
  
  console.log('[TEST] Waiting 5 seconds...');
  await page.waitForTimeout(5000);
  
  console.log('[TEST] Taking screenshot...');
  await page.screenshot({ path: '/tmp/inspector-debug.png', fullPage: true });
  
  console.log('[TEST] Page title:', await page.title());
  console.log('[TEST] Page URL:', page.url());
  
  console.log('\n[TEST] === ALL CONSOLE LOGS ===');
  allLogs.forEach(log => console.log(log));
  
  console.log('\n[TEST] === PAGE CONTENT ===');
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log(bodyText.slice(0, 500));
});
