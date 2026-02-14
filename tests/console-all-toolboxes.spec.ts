import { test, expect } from '@playwright/test';

test.describe('Console Check - All Toolboxes', () => {
  const captureConsole = (page: any) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    page.on('console', (msg: any) => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') errors.push(text);
      if (type === 'warning' || type === 'warn') warnings.push(text);
    });
    
    page.on('pageerror', (error: Error) => {
      errors.push(`PAGE ERROR: ${error.message}`);
    });
    
    return { errors, warnings };
  };

  test('Inspector - No console errors', async ({ page }) => {
    const { errors, warnings } = captureConsole(page);
    
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log(`Inspector - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    if (warnings.length > 0) {
      console.log('Warnings:', warnings);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Surface - No console errors', async ({ page }) => {
    const { errors, warnings } = captureConsole(page);
    
    await page.goto('http://127.0.0.1:5173/#/surface');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log(`Surface - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    if (warnings.length > 0) {
      console.log('Warnings:', warnings);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Bushing - No console errors', async ({ page }) => {
    const { errors, warnings } = captureConsole(page);
    
    await page.goto('http://127.0.0.1:5173/#/bushing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log(`Bushing - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    if (warnings.length > 0) {
      console.log('Warnings:', warnings);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Home - No console errors', async ({ page }) => {
    const { errors, warnings } = captureConsole(page);
    
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log(`Home - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    if (warnings.length > 0) {
      console.log('Warnings:', warnings);
    }
    
    expect(errors.length).toBe(0);
  });
});
