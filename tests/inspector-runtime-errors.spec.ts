import { test } from '@playwright/test';

test('Check ALL console output', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  await page.goto('/#/inspector');
  await page.waitForTimeout(2000);
  
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Name,Age\nAlice,30\nBob,25')
  });
  await fileInput.dispatchEvent('change');
  
  await page.waitForTimeout(5000);
  
  console.log('\n=== ALL CONSOLE OUTPUT ===');
  logs.filter(l => l.includes('LOAD') || l.includes('FILE INPUT') || l.includes('WRAPPER') || l.includes('FILTER') || l.includes('★')).forEach(l => console.log(l));
  console.log('=== END ===\n');
  
  // Check grid
  const gridCells = page.locator('[role="gridcell"], td, th').filter({ hasText: /Alice|Bob|Name|Age/ });
  const count = await gridCells.count();
  console.log(`Data cells found: ${count}`);
});
