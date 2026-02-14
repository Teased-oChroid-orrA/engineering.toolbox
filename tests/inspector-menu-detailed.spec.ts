import { test, expect } from '@playwright/test';

test.describe('Inspector Menu - Detailed Testing', () => {
  test('should open and test the Inspector dropdown menu', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Click on the "Inspector ▾" button to open menu
    const inspectorButton = page.locator('button').filter({ hasText: /Inspector\s*▾/ }).first();
    const buttonExists = await inspectorButton.count();
    console.log(`✓ Inspector dropdown button found: ${buttonExists}`);

    if (buttonExists > 0) {
      await inspectorButton.click();
      await page.waitForTimeout(500);

      // Take screenshot of opened menu
      await page.screenshot({ path: 'test-results/inspector-menu-opened.png' });

      // Get all visible menu items
      const menuItems = page.locator('[role="menuitem"], button, a');
      const count = await menuItems.count();
      console.log(`✓ Menu items visible: ${count}`);

      // Log all text content
      const allText = await page.locator('body').textContent();
      console.log('✓ Page text sample (first 500 chars):', allText?.substring(0, 500) ?? '');
    }
  });

  test('should check for context menu system in layout', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Evaluate to find all elements that might trigger context menu
    const result = await page.evaluate(() => {
      const elements = {
        buttonsWithText: [] as string[],
        dropdowns: [] as string[],
        modals: [] as string[],
        contextMenuElements: [] as string[]
      };

      // Find all buttons
      document.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent?.trim();
        if (text) elements.buttonsWithText.push(text);
      });

      // Find all dropdowns/selects
      document.querySelectorAll('select, [role="combobox"]').forEach(dd => {
        const text = dd.textContent?.trim();
        if (text) elements.dropdowns.push(text);
      });

      // Find modals
      document.querySelectorAll('[role="dialog"], .modal, .popup').forEach(m => {
        elements.modals.push('Found');
      });

      // Check for event listeners (heuristic)
      if ((window as any).__CONTEXT_MENU__ || (window as any).__MENU_ACTIVE__) {
        elements.contextMenuElements.push('Found context menu system');
      }

      return elements;
    });

    console.log('=== INSPECTOR UI STRUCTURE ===');
    console.log('Buttons found:', result.buttonsWithText.slice(0, 10).join(', '));
    console.log('Dropdowns found:', result.dropdowns.slice(0, 5).join(', '));
    console.log('Modals found:', result.modals.length);
    console.log('Context menu system:', result.contextMenuElements.length ? 'Detected' : 'Not detected');

    await page.screenshot({ path: 'test-results/inspector-ui-structure.png' });
  });

  test('should test clicking Options dropdown', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Click Options button
    const optionsButton = page.locator('button').filter({ hasText: /Options\s*▾/ }).first();
    const optionsExists = await optionsButton.count();
    console.log(`✓ Options button found: ${optionsExists}`);

    if (optionsExists > 0) {
      await optionsButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'test-results/inspector-options-menu.png' });

      // List all visible items
      const bodyText = await page.locator('body').textContent();
      console.log('✓ Menu content:', bodyText?.substring(0, 300) ?? '');
    }
  });

  test('should locate and test file upload trigger', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Find file input
    const fileInput = page.locator('input[type="file"]');
    const fileInputCount = await fileInput.count();
    console.log(`✓ File input elements: ${fileInputCount}`);

    if (fileInputCount > 0) {
      // Get the file input element
      const inputElement = fileInput.first();
      
      // Try to find what triggers the file input
      const parentText = await inputElement.evaluate((el) => {
        const parent = el.parentElement;
        const inputEl = el as HTMLInputElement;
        return {
          parentTag: parent?.tagName,
          parentClass: parent?.className,
          parentText: parent?.textContent?.substring(0, 50),
          inputId: el.id,
          inputName: inputEl.name
        };
      });

      console.log('✓ File input parent:', parentText);

      // Look for any button that might trigger this
      const buttonsNearby = await page.locator('button').count();
      console.log(`✓ Total buttons on page: ${buttonsNearby}`);

      // Look for "Upload" or "Load" text
      const uploadText = page.locator('text=/Upload|Load/i');
      const uploadCount = await uploadText.count();
      console.log(`✓ Upload/Load text elements: ${uploadCount}`);
    }

    await page.screenshot({ path: 'test-results/inspector-upload-location.png' });
  });

  test('should test the entire menu flow with developer tools', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    const consoleLogs: {type: string; message: string}[] = [];

    // Capture all console events
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        message: msg.text()
      });
    });

    // Trigger various interactions
    
    // 1. Click Inspector dropdown
    const inspectorBtn = page.locator('button').filter({ hasText: /Inspector\s*▾/ }).first();
    if (await inspectorBtn.count() > 0) {
      console.log('\n→ Clicking Inspector dropdown');
      await inspectorBtn.click();
      await page.waitForTimeout(300);
    }

    // 2. Click Options dropdown
    const optionsBtn = page.locator('button').filter({ hasText: /Options\s*▾/ }).first();
    if (await optionsBtn.count() > 0) {
      console.log('→ Clicking Options dropdown');
      await optionsBtn.click();
      await page.waitForTimeout(300);
    }

    // 3. Try to interact with file input
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      console.log('→ Found file input');
      // Don't actually upload, just log
    }

    // 4. Check for checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`✓ Found ${checkboxCount} checkboxes`);

    // 5. Trigger right-click
    console.log('→ Triggering right-click');
    await page.evaluate(() => {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      document.body.dispatchEvent(event);
    });

    await page.waitForTimeout(500);

    // Log relevant console messages
    console.log('\n=== CONSOLE LOG SUMMARY ===');
    const relevantLogs = consoleLogs.filter(log => 
      log.message.includes('[') || 
      log.message.includes('Menu') || 
      log.message.includes('menu') ||
      log.message.includes('context')
    );
    
    if (relevantLogs.length > 0) {
      console.log('Found relevant logs:');
      relevantLogs.forEach(log => console.log(`  [${log.type}] ${log.message}`));
    } else {
      console.log('No menu-related logs found');
      console.log('All logs (first 20):');
      consoleLogs.slice(0, 20).forEach(log => {
        if (!log.message.includes('GET') && !log.message.includes('undefined')) {
          console.log(`  [${log.type}] ${log.message.substring(0, 80)}`);
        }
      });
    }

    await page.screenshot({ path: 'test-results/inspector-dev-tools-test.png' });
  });

  test('should examine the layout.svelte menu registration', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Look for any menu-related attributes or data
    const pageData = await page.evaluate(() => {
      return {
        htmlDataAttrs: Array.from(document.documentElement.attributes).map(a => `${a.name}=${a.value}`),
        bodyDataAttrs: Array.from(document.body.attributes).map(a => `${a.name}=${a.value}`),
        windowProps: Object.keys((window as any)).filter(k => k.includes('menu') || k.includes('Menu') || k.includes('MENU')),
        documentClasses: document.body.className,
        stylesheets: document.styleSheets.length
      };
    });

    console.log('\n=== PAGE DATA ATTRIBUTES ===');
    console.log('HTML attrs:', pageData.htmlDataAttrs.slice(0, 5).join(', '));
    console.log('Body attrs:', pageData.bodyDataAttrs.slice(0, 5).join(', '));
    console.log('Menu-related window props:', pageData.windowProps.length ? pageData.windowProps.join(', ') : 'None');
    console.log('Body classes:', pageData.documentClasses);
    console.log('Stylesheets loaded:', pageData.stylesheets);

    await page.screenshot({ path: 'test-results/inspector-page-attributes.png' });
  });

  test('should capture full HTML structure for menu analysis', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    // Get the HTML structure
    const htmlContent = await page.content();
    
    // Look for menu-related code
    const hasContextMenu = htmlContent.includes('contextmenu') || htmlContent.includes('context-menu');
    const hasEventListener = htmlContent.includes('addEventListener') && htmlContent.includes('menu');
    const hasMenuController = htmlContent.includes('MenuController') || htmlContent.includes('buildInspectorContextMenu');
    const hasLoadingMenu = htmlContent.includes('openFallbackLoadFromMenu') || htmlContent.includes('openStreamLoadFromMenu');

    console.log('\n=== HTML STRUCTURE ANALYSIS ===');
    console.log(`Has contextmenu references: ${hasContextMenu}`);
    console.log(`Has menu event listeners: ${hasEventListener}`);
    console.log(`Has MenuController: ${hasMenuController}`);
    console.log(`Has menu loading actions: ${hasLoadingMenu}`);

    // Check for specific menu item patterns
    const menuItemPatterns = [
      'load_stream', 'load_fallback', 'open_schema', 'open_recipes',
      'open_column_picker', 'open_shortcuts', 'open_builder', 'clear_all_filters',
      'export_current_view', 'export_filtered_rows', 'export_analysis_bundle',
      'toggle_quiet_logs', 'toggle_auto_restore'
    ];

    const foundMenuIds = menuItemPatterns.filter(id => htmlContent.includes(id));
    console.log(`\nFound ${foundMenuIds.length}/${menuItemPatterns.length} expected menu item IDs`);
    if (foundMenuIds.length > 0) {
      console.log('Found menu items:', foundMenuIds.slice(0, 5).join(', '));
    }

    // Save HTML for inspection
    const fs = require('fs');
    fs.writeFileSync('/Users/nautilus/Desktop/StructuralCompanionDesktop/test-results/inspector-page-source.html', htmlContent);
    console.log('\n✓ Full HTML saved to inspector-page-source.html');

    await page.screenshot({ path: 'test-results/inspector-html-check.png' });
  });

  test('should test each specific menu action from MenuController', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#/inspector');
    await page.waitForLoadState('networkidle');

    const testResults: Record<string, boolean | string> = {};

    // Test each expected menu action
    const menuActions = {
      'load_stream': 'Load File (Stream)',
      'load_fallback': 'Upload CSV',
      'open_schema': 'Schema Inspector',
      'open_recipes': 'Recipes',
      'open_column_picker': 'Columns',
      'open_shortcuts': 'Shortcuts',
      'open_builder': 'Advanced Builder',
      'clear_all_filters': 'Clear Filters',
      'export_current_view': 'Export Current View',
      'export_filtered_rows': 'Export Filtered Rows',
      'export_analysis_bundle': 'Export Analysis Bundle',
      'rerun_schema': 'Refresh Schema',
      'toggle_regex_help': 'Regex Help',
      'toggle_quiet_logs': 'Quiet Logs',
      'toggle_auto_restore': 'Auto-restore'
    };

    const pageContent = await page.content();

    for (const [id, label] of Object.entries(menuActions)) {
      const found = pageContent.includes(`'${id}'`) || pageContent.includes(`"${id}"`);
      testResults[label] = found;
    }

    console.log('\n=== MENU ACTION DETECTION ===');
    const working = Object.entries(testResults).filter(([_, v]) => v);
    const broken = Object.entries(testResults).filter(([_, v]) => !v);

    console.log(`✓ Working actions (${working.length}):`);
    working.forEach(([label, _]) => console.log(`  • ${label}`));

    if (broken.length > 0) {
      console.log(`\n✗ Missing/broken actions (${broken.length}):`);
      broken.forEach(([label, _]) => console.log(`  • ${label}`));
    }

    await page.screenshot({ path: 'test-results/inspector-action-check.png' });
  });
});
