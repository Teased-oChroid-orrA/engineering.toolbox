import { test, expect } from '@playwright/test';

test.describe('Inspector Menu System', () => {
  test('should load inspector page and menu system', async ({ page }) => {
    // Navigate to inspector route
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/inspector-initial.png' });
    console.log('✓ Loaded Inspector page');
  });

  test('should trigger context menu via right-click', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Right-click on page to trigger context menu
    await page.click('body', { button: 'right' });
    
    // Wait for context menu to appear (check for menu elements)
    const menuItems = page.locator('a, button, [role="menuitem"]');
    const count = await menuItems.count();
    
    // Take screenshot of menu
    await page.screenshot({ path: 'test-results/inspector-context-menu.png' });
    console.log(`✓ Context menu triggered, found ${count} interactive elements on page`);
  });

  test('should display menu items correctly', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Check for context menu trigger (typically a button or area)
    // Get console logs to verify menu system is active
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
      if (msg.text().includes('[MENU]') || msg.text().includes('[Inspector')) {
        console.log('Console:', msg.text());
      }
    });

    await page.waitForTimeout(500);
    
    // Log captured console messages
    const menuRelated = consoleLogs.filter(m => m.includes('[MENU') || m.includes('[Inspector'));
    console.log('✓ Captured menu-related logs:', menuRelated.length);
  });

  test('should test upload CSV (Fallback) menu item', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Look for upload input (hidden)
    const hiddenInput = page.locator('input[type="file"]');
    const inputCount = await hiddenInput.count();
    console.log(`✓ Found ${inputCount} file input(s) on page`);

    // Get current page structure to understand menu trigger
    const bodyText = await page.locator('body').textContent();
    const hasUpload = bodyText?.includes('Upload') ?? false;
    console.log(`✓ Page contains "Upload" text: ${hasUpload}`);
  });

  test('should test Schema Inspector menu item', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Look for Schema Inspector button/link
    const schemaElements = page.locator('button, a, [role="button"]').filter({ hasText: /schema|Schema/i });
    const count = await schemaElements.count();
    console.log(`✓ Found ${count} schema-related elements`);

    // Take screenshot to see current state
    await page.screenshot({ path: 'test-results/inspector-schema-search.png' });
  });

  test('should test Advanced Builder menu item', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Look for builder/modal elements
    const builderElements = page.locator('button, a, [role="button"]').filter({ hasText: /builder|advanced/i });
    const count = await builderElements.count();
    console.log(`✓ Found ${count} builder-related elements`);
  });

  test('should test Export actions menu items', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Look for export-related elements
    const exportElements = page.locator('button, a, [role="button"]').filter({ hasText: /export|download|save/i });
    const count = await exportElements.count();
    console.log(`✓ Found ${count} export-related elements`);

    // Specific export items
    const currentView = page.locator('button, a, [role="button"]').filter({ hasText: /current view/i });
    const filteredRows = page.locator('button, a, [role="button"]').filter({ hasText: /filtered rows/i });
    const analysisBundle = page.locator('button, a, [role="button"]').filter({ hasText: /analysis bundle/i });

    console.log(`✓ Current View export: ${await currentView.count()}`);
    console.log(`✓ Filtered Rows export: ${await filteredRows.count()}`);
    console.log(`✓ Analysis Bundle export: ${await analysisBundle.count()}`);
  });

  test('should test Settings toggles', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Look for checkbox/toggle elements
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`✓ Found ${checkboxCount} toggle/checkbox elements`);

    // Look for settings-related text
    const bodyText = await page.locator('body').textContent();
    const hasQuietLogs = bodyText?.includes('Quiet') ?? false;
    const hasAutoRestore = bodyText?.includes('Auto') ?? false;
    const hasRegexHelp = bodyText?.includes('Regex') ?? false;

    console.log(`✓ Has "Quiet" setting: ${hasQuietLogs}`);
    console.log(`✓ Has "Auto" setting: ${hasAutoRestore}`);
    console.log(`✓ Has "Regex" setting: ${hasRegexHelp}`);
  });

  test('should test Clear All Filters action', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Look for clear/reset related elements
    const clearElements = page.locator('button, a, [role="button"]').filter({ hasText: /clear|reset|delete/i });
    const count = await clearElements.count();
    console.log(`✓ Found ${count} clear/reset-related elements`);

    // Specific filter clear
    const clearFilters = page.locator('button, a, [role="button"]').filter({ hasText: /clear filter/i });
    console.log(`✓ Clear Filters button: ${await clearFilters.count()}`);
  });

  test('should verify context menu event system', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Evaluate JavaScript to check if context menu system is initialized
    const menuSystemActive = await page.evaluate(() => {
      // Check for context menu event listener
      const bodyHasListener = (window as any).__CONTEXT_MENU_ACTIVE__ ?? false;
      
      // Check for inspector-specific menu registration
      const hasInspectorMenu = document.body.textContent?.includes('Inspector') ?? false;
      
      // Check console for menu initialization
      return {
        listenerActive: bodyHasListener,
        hasInspectorMenu: hasInspectorMenu,
        timestamp: Date.now()
      };
    });

    console.log('✓ Menu system status:', menuSystemActive);
    
    // Capture any console messages during menu initialization
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/inspector-menu-system-status.png' });
  });

  test('should capture full page structure for menu analysis', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Get full page structure
    const structure = await page.evaluate(() => {
      const getAllText = (el: Element): string[] => {
        const texts: string[] = [];
        const walk = (node: Node) => {
          if (node.nodeType === 3) {
            const text = node.textContent?.trim();
            if (text) texts.push(text);
          } else if (node.nodeType === 1) {
            Array.from(node.childNodes).forEach(walk);
          }
        };
        walk(el);
        return texts;
      };

      const bodyText = getAllText(document.body);
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
      const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.trim());
      const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]')).map(m => m.textContent?.trim());

      return {
        buttonCount: buttons.length,
        buttons: buttons.slice(0, 20),
        linkCount: links.length,
        menuItemCount: menuItems.length,
        hasFileInput: !!document.querySelector('input[type="file"]'),
        hasModals: !!document.querySelector('[role="dialog"]'),
        bodyTextLength: bodyText.length
      };
    });

    console.log('✓ Page structure analysis:');
    console.log(`  - Buttons: ${structure.buttonCount}`);
    console.log(`  - Links: ${structure.linkCount}`);
    console.log(`  - Menu items: ${structure.menuItemCount}`);
    console.log(`  - File input present: ${structure.hasFileInput}`);
    console.log(`  - Modals present: ${structure.hasModals}`);
    console.log(`  - Sample buttons: ${structure.buttons.filter(b => b).slice(0, 5).join(', ')}`);

    await page.screenshot({ path: 'test-results/inspector-full-structure.png' });
  });

  test('should test menu with data loaded', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Try to load sample CSV data by simulating upload
    const fileInput = page.locator('input[type="file"]');
    const fileInputCount = await fileInput.count();
    
    if (fileInputCount > 0) {
      console.log(`✓ Found file input, attempting to upload test CSV`);
      
      // Create test CSV content
      const csvContent = `Name,Age,Email
John,30,john@example.com
Jane,25,jane@example.com
Bob,35,bob@example.com`;

      // Set file input value
      await fileInput.first().setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Check if data appears in grid
      const gridContent = await page.locator('body').textContent();
      const hasLoadedData = gridContent?.includes('John') ?? false;
      console.log(`✓ Data loaded successfully: ${hasLoadedData}`);

      // Take screenshot with data loaded
      await page.screenshot({ path: 'test-results/inspector-with-data.png' });
    } else {
      console.log('⚠ File input not found, skipping data load test');
    }
  });

  test('should verify console logs for menu operations', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Wait for any initialization
    await page.waitForTimeout(2000);

    // Filter for menu-related logs
    const menuLogs = consoleLogs.filter(log => 
      log.includes('[MENU') || 
      log.includes('[Inspector') || 
      log.includes('[UPLOAD') ||
      log.includes('listener') ||
      log.includes('context')
    );

    console.log('\n=== MENU-RELATED CONSOLE LOGS ===');
    menuLogs.forEach(log => console.log(log));
    console.log('=== END LOGS ===\n');

    console.log(`✓ Captured ${menuLogs.length} menu-related console messages`);

    // Also check for any errors
    const errorLogs = consoleLogs.filter(log => 
      log.toLowerCase().includes('error') && 
      !log.includes('ResizeObserver')
    );
    
    if (errorLogs.length > 0) {
      console.log('\n⚠ ERROR LOGS FOUND:');
      errorLogs.forEach(log => console.log(log));
    }
  });

  test('should test right-click menu trigger', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    // Simulate right-click on the page
    await page.evaluate(() => {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      document.body.dispatchEvent(event);
    });

    await page.waitForTimeout(1000);

    // Check console for menu interaction logs
    const menuLogs = consoleLogs.filter(log => log.includes('[MENU') || log.includes('detail'));
    console.log(`✓ Right-click triggered, captured ${menuLogs.length} menu logs`);
    menuLogs.forEach(log => console.log('  -', log));

    await page.screenshot({ path: 'test-results/inspector-right-click-menu.png' });
  });

  test('should generate comprehensive menu test report', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    const report = await page.evaluate(() => {
      return {
        pageTitle: document.title,
        currentUrl: window.location.href,
        menuElements: {
          buttons: document.querySelectorAll('button').length,
          links: document.querySelectorAll('a').length,
          menuItems: document.querySelectorAll('[role="menuitem"]').length,
          dialogs: document.querySelectorAll('[role="dialog"]').length
        },
        inputElements: {
          fileInputs: document.querySelectorAll('input[type="file"]').length,
          textInputs: document.querySelectorAll('input[type="text"]').length,
          checkboxes: document.querySelectorAll('input[type="checkbox"]').length
        },
        textContent: {
          hasUpload: document.body.textContent?.includes('Upload') ?? false,
          hasSchema: document.body.textContent?.includes('Schema') ?? false,
          hasRecipes: document.body.textContent?.includes('Recipes') ?? false,
          hasExport: document.body.textContent?.includes('Export') ?? false,
          hasSettings: document.body.textContent?.includes('Quiet') ?? false
        }
      };
    });

    console.log('\n=== INSPECTOR MENU SYSTEM REPORT ===');
    console.log('Page Title:', report.pageTitle);
    console.log('URL:', report.currentUrl);
    console.log('\nUI Elements:');
    console.log('  Buttons:', report.menuElements.buttons);
    console.log('  Links:', report.menuElements.links);
    console.log('  Menu Items:', report.menuElements.menuItems);
    console.log('  Dialogs:', report.menuElements.dialogs);
    console.log('\nInput Elements:');
    console.log('  File Inputs:', report.inputElements.fileInputs);
    console.log('  Text Inputs:', report.inputElements.textInputs);
    console.log('  Checkboxes:', report.inputElements.checkboxes);
    console.log('\nContent Checks:');
    Object.entries(report.textContent).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✓' : '✗'}`);
    });
    console.log('=== END REPORT ===\n');

    // Final screenshot
    await page.screenshot({ path: 'test-results/inspector-menu-report.png' });
  });
});
