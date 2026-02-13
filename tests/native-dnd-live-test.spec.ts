import { test, expect } from '@playwright/test';

test.describe('Native Drag-and-Drop - Live Test', () => {
  test('should reposition cards after drag', async ({ page }) => {
    // Navigate to bushing page
    await page.goto('http://127.0.0.1:5173/#/bushing');
    await page.waitForLoadState('networkidle');
    
    // Wait for draggable elements
    await page.waitForSelector('[draggable="true"]', { timeout: 10000 });
    
    // Get initial order from localStorage
    const initialOrder = await page.evaluate(() => {
      const stored = localStorage.getItem('scd.bushing.layout.v3');
      return stored ? JSON.parse(stored) : null;
    });
    
    console.log('Initial order:', initialOrder);
    
    // Get all draggable cards in left lane
    const draggables = await page.$$('[data-drag-id]');
    console.log(`Found ${draggables.length} draggable cards`);
    
    if (draggables.length >= 2) {
      const firstCard = draggables[0];
      const secondCard = draggables[1];
      
      // Get IDs
      const firstId = await firstCard.getAttribute('data-drag-id');
      const secondId = await secondCard.getAttribute('data-drag-id');
      console.log(`Dragging ${firstId} over ${secondId}`);
      
      // Get bounding boxes
      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();
      
      if (firstBox && secondBox) {
        // Perform drag
        await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + 20);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + 20, { steps: 10 });
        await page.waitForTimeout(100);
        await page.mouse.up();
        
        // Wait for state update
        await page.waitForTimeout(500);
        
        // Check if order changed in localStorage
        const newOrder = await page.evaluate(() => {
          const stored = localStorage.getItem('scd.bushing.layout.v3');
          return stored ? JSON.parse(stored) : null;
        });
        
        console.log('New order:', newOrder);
        
        // Verify order changed
        expect(newOrder).toBeTruthy();
        expect(JSON.stringify(newOrder)).not.toBe(JSON.stringify(initialOrder));
        
        // Verify the cards actually swapped
        if (initialOrder && newOrder) {
          const initialLeft = initialOrder.leftCardOrder || [];
          const newLeft = newOrder.leftCardOrder || [];
          
          console.log('Initial left:', initialLeft);
          console.log('New left:', newLeft);
          
          // The order should be different
          expect(newLeft).not.toEqual(initialLeft);
        }
      }
    }
  });
  
  test('should persist layout to localStorage immediately', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/bushing');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[draggable="true"]', { timeout: 10000 });
    
    // Get initial layout
    const before = await page.evaluate(() => {
      return localStorage.getItem('scd.bushing.layout.v3');
    });
    
    console.log('Layout before:', before);
    
    // Click an up/down button (easier to test)
    const upButton = await page.$('[title*="Move up"]');
    if (upButton) {
      await upButton.click();
      await page.waitForTimeout(500);
      
      // Check if localStorage updated
      const after = await page.evaluate(() => {
        return localStorage.getItem('scd.bushing.layout.v3');
      });
      
      console.log('Layout after:', after);
      
      // Should be different
      expect(after).not.toBe(before);
    }
  });
});
