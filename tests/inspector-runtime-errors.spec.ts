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
  console.log('\n=== GRID CHECK ===');
  
  // Check for any visible text from CSV
  const anyText = await page.locator('text=/Alice|Bob|Name|Age/').count();
  console.log(`Any text from CSV: ${anyText}`);
  
  // Check grid cells
  const gridCells = page.locator('[role="gridcell"], td, th').filter({ hasText: /Alice|Bob|Name|Age/ });
  const count = await gridCells.count();
  console.log(`Grid cells found: ${count}`);
  
  // Check for virtual grid container
  const virtualGrid = await page.locator('.virtual-grid, [data-virtual-grid]').count();
  console.log(`Virtual grid containers: ${virtualGrid}`);
});
