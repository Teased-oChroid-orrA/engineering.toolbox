import { expect, test } from '@playwright/test';

test.describe('bushing e2e smoke UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/bushing');
    await expect(page.getByText('Bushing Toolbox')).toBeVisible();
  });

  test('loads drafting/export shell and toggles render mode', async ({ page }) => {
    await expect(page.getByText('5. Drafting / Export')).toBeVisible();
    const toggle = page.getByRole('button', { name: /Draft Renderer:/ });
    await expect(toggle).toBeVisible();
    await toggle.click({ force: true });
    await expect(toggle).toContainText(/Draft Renderer:/);
    await expect(page.getByRole('button', { name: 'Export SVG' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
  });

  test('shows Babylon renderer status and viewport controls', async ({ page }) => {
    await expect(page.getByText('Draft Engine: Babylon')).toBeVisible();
    const activeBanner = page.getByText('Babylon renderer active');
    await expect(page.getByText(/Babylon renderer active|Babylon init failed|Babylon init issue:/).first()).toBeVisible();
    if (await activeBanner.isVisible().catch(() => false)) {
      await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
      await expect(page.getByRole('button', { name: '+' })).toBeVisible();
      await expect(page.getByRole('button', { name: '-' })).toBeVisible();
    }
  });

  test('switches profile type and keeps results visible', async ({ page }) => {
    await page.getByRole('button', { name: 'Flanged' }).first().click();
    await expect(page.getByText('Results Summary')).toBeVisible();
    await expect(page.getByText('Safety Margins (Yield)')).toBeVisible();
    await expect(page.getByText('Fit Physics')).toBeVisible();
  });

  test('internal countersink mode gates editable fields and syncs derived value', async ({ page }) => {
    await page.evaluate(() => {
      const key = 'scd.bushing.inputs.v15';
      const existing = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(key, JSON.stringify({
        ...existing,
        idType: 'countersink',
        csMode: 'depth_angle',
        idBushing: 0.375,
        csDepth: 0.1,
        csAngle: 90
      }));
    });
    await page.reload();
    await expect(page.getByText('Bushing Toolbox')).toBeVisible();

    const csMode = page.locator("xpath=//label[normalize-space()='Internal CS Mode']/following::select[1]");
    const csDia = page.locator("xpath=//label[normalize-space()='CS Dia']/following-sibling::div//input[1]");
    const csDepth = page.locator("xpath=//label[normalize-space()='CS Depth']/following-sibling::div//input[1]");
    const csAngle = page.locator("xpath=//label[normalize-space()='Internal CS Angle']/following-sibling::div//input[1]");

    await csMode.selectOption('depth_angle');
    await expect(csMode).toHaveValue('depth_angle');
    await expect(csDia).toBeDisabled();
    await expect(csDepth).toBeEnabled();
    await expect(csAngle).toBeEnabled();
    await csDepth.fill('0.1');
    await csAngle.fill('90');
    await expect(csDia).toHaveValue(/0\.575/);

    await csMode.selectOption('dia_angle');
    await expect(csMode).toHaveValue('dia_angle');
    await expect.poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('scd.bushing.inputs.v15') ?? '{}').csMode)
    ).toBe('dia_angle');
    await expect(csDepth).toBeDisabled();
    await expect(csDia).toBeEnabled();
    await expect(csAngle).toBeEnabled();
    await csDia.fill('0.675');
    await csAngle.fill('90');
    await expect.poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('scd.bushing.inputs.v15') ?? '{}').csDia)
    ).toBe(0.675);
    await expect.poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('scd.bushing.inputs.v15') ?? '{}').csDepth)
    ).toBeCloseTo(0.15, 6);
    await expect(csDepth).toHaveValue(/0\.15/);
  });

  test('external countersink mode gates editable fields and syncs derived value', async ({ page }) => {
    await page.evaluate(() => {
      const key = 'scd.bushing.inputs.v15';
      const existing = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(key, JSON.stringify({
        ...existing,
        bushingType: 'countersink',
        extCsMode: 'depth_angle',
        boreDia: 0.5,
        interference: 0,
        extCsDepth: 0.1,
        extCsAngle: 90
      }));
    });
    await page.reload();
    await expect(page.getByText('Bushing Toolbox')).toBeVisible();

    const extMode = page.locator("xpath=//label[normalize-space()='External CS Mode']/following::select[1]");
    const extDia = page.locator("xpath=//label[normalize-space()='External CS Dia']/following-sibling::div//input[1]");
    const extDepth = page.locator("xpath=//label[normalize-space()='External CS Depth']/following-sibling::div//input[1]");
    const extAngle = page.locator("xpath=//label[normalize-space()='External CS Angle']/following-sibling::div//input[1]");

    await extMode.selectOption('depth_angle');
    await expect(extMode).toHaveValue('depth_angle');
    await expect(extDia).toBeDisabled();
    await expect(extDepth).toBeEnabled();
    await expect(extAngle).toBeEnabled();
    await extDepth.fill('0.1');
    await extAngle.fill('90');
    await expect(extDia).toHaveValue(/0\.7/);

    await extMode.selectOption('dia_angle');
    await expect(extMode).toHaveValue('dia_angle');
    await expect.poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('scd.bushing.inputs.v15') ?? '{}').extCsMode)
    ).toBe('dia_angle');
    await expect(extDepth).toBeDisabled();
    await expect(extDia).toBeEnabled();
    await expect(extAngle).toBeEnabled();
  });

  test('metric mode stays coherent with countersink inputs', async ({ page }) => {
    await page.evaluate(() => {
      const key = 'scd.bushing.inputs.v15';
      const existing = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(key, JSON.stringify({
        ...existing,
        units: 'metric',
        bushingType: 'countersink',
        idType: 'countersink',
        boreDia: 12.7,
        idBushing: 9.525,
        housingLen: 12.7,
        housingWidth: 38.1,
        edgeDist: 19.05,
        csMode: 'depth_angle',
        csDepth: 2.54,
        csAngle: 100,
        extCsMode: 'dia_depth',
        extCsDia: 17.5,
        extCsDepth: 2.0
      }));
    });
    await page.reload();
    await expect(page.getByText('Bushing Toolbox')).toBeVisible();
    await expect(page.getByText('Results Summary')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('NaN');
    await expect(page.getByText('SECTION A-A')).toBeVisible();
  });

  test('babylon viewport controls remain responsive when active', async ({ page }) => {
    const activeBanner = page.getByText('Babylon renderer active');
    await expect(page.getByText(/Babylon renderer active|Babylon init failed|Babylon init issue:/).first()).toBeVisible();
    if (await activeBanner.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '+' }).click();
      await page.getByRole('button', { name: '-' }).click();
      await page.getByRole('button', { name: 'Reset' }).click();
    }
    await expect(page.getByText('Results Summary')).toBeVisible();
    await expect(page.getByText('SECTION A-A')).toBeVisible();
  });

  test('interference priority controls render and diagnostics update', async ({ page }) => {
    await page.getByText('Advanced Process Controls').click();
    await expect(page.getByText('Tolerance Priority Controls')).toBeVisible();
    await expect(page.getByText('Enforce Interference Tolerance')).toBeVisible();
    await expect(page.getByText('Lock Bore (Reamer Fixed)')).toBeVisible();
    await expect(page.getByText('Preserve Bore Nominal')).toBeVisible();
    await expect(page.getByText('Allow Bore Nominal Shift')).toBeVisible();
    await expect(page.getByText('Bore Capability Mode')).toBeVisible();
    await expect(page.getByText('Min Achievable Bore Tol Width')).toBeVisible();

    const enforce = page.locator("xpath=//span[normalize-space()='Enforce Interference Tolerance']/following::input[@type='checkbox'][1]");
    await enforce.setChecked(true, { force: true });
    await expect.poll(async () =>
      page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('scd.bushing.inputs.v15') ?? '{}');
        return Boolean(raw?.interferencePolicy?.enabled);
      })
    ).toBeTruthy();
    await expect(page.getByText('Interference Enforcement')).toBeVisible();
  });

  test('top-level drag reorder persists and preview updates on hover', async ({ page }) => {
    const setup = page.locator("[data-dnd-lane='left'][data-dnd-card='setup']").first();
    const guidance = page.locator("[data-dnd-lane='left'][data-dnd-card='guidance']").first();
    await expect(setup).toBeVisible();
    await expect(guidance).toBeVisible();

    const markers = await page.evaluate(() => [...document.querySelectorAll("[data-dnd-lane='left'][data-dnd-card]")].length);
    expect(markers).toBeGreaterThan(2);

    await page.evaluate(() => (window as any).__SCD_BUSHING_TEST_REORDER__?.('left', 'setup', 'guidance'));
    await expect.poll(async () =>
      page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('scd.bushing.layout.v3') ?? '{}');
        return raw?.leftCardOrder;
      })
    ).toEqual(['header', 'setup', 'guidance', 'geometry', 'profile', 'process']);

    await page.reload();
    await expect(page.getByText('Bushing Toolbox')).toBeVisible();
    await page.waitForLoadState('domcontentloaded');
    await expect.poll(async () =>
      page.evaluate(() => {
        try {
          const raw = JSON.parse(localStorage.getItem('scd.bushing.layout.v3') ?? '{}');
          return raw?.leftCardOrder;
        } catch {
          return null;
        }
      })
    ).toEqual(['header', 'setup', 'guidance', 'geometry', 'profile', 'process']);
  });

  test('nested diagnostics cards reorder without moving parent lane', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.setItem('scd.bushing.layout.v2', JSON.stringify({
        leftCardOrder: ['header', 'guidance', 'setup', 'geometry', 'profile', 'process'],
        rightCardOrder: ['drafting', 'summary', 'diagnostics']
      }));
      localStorage.setItem('scd.bushing.layout.v2.diagnostics', JSON.stringify(['edge', 'wall', 'warnings']));
      localStorage.removeItem('scd.bushing.layout.v3');
      localStorage.removeItem('scd.bushing.layout.v3.diagnostics');
    });
    await page.reload();
    await expect(page.getByText('Bushing Toolbox')).toBeVisible();

    const edge = page.locator("[data-diag-card='edge']").first();
    const wall = page.locator("[data-diag-card='wall']").first();
    await expect(edge).toBeVisible();
    await expect(wall).toBeVisible();
    await page.evaluate(() => (window as any).__SCD_BUSHING_TEST_REORDER_DIAG__?.('edge', 'wall'));

    await expect.poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('scd.bushing.layout.v3.diagnostics') ?? '[]'))
    ).toEqual(expect.arrayContaining(['wall', 'edge']));
    await expect.poll(async () =>
      page.evaluate(() => (JSON.parse(localStorage.getItem('scd.bushing.layout.v3.diagnostics') ?? '[]') as string[]).slice(0, 2))
    ).toEqual(['wall', 'edge']);
    await expect.poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('scd.bushing.layout.v3') ?? '{}')?.rightCardOrder)
    ).toEqual(['drafting', 'summary', 'diagnostics']);
  });
});
