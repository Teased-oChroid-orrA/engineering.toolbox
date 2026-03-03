import { expect, test } from '@playwright/test';

async function openSurface(page: import('@playwright/test').Page) {
  await page.goto('/#/surface');
  await expect(page.locator('#app-content-root[data-route-ready="surface"]')).toBeVisible();
  const promptBtn = page.getByRole('button', { name: 'Use Core Mode (Recommended)' });
  await promptBtn.click({ timeout: 2000 }).catch(() => {});
  await page.locator('.fixed.inset-0.z-\\[360\\]').waitFor({ state: 'hidden', timeout: 2500 }).catch(() => {});
  await expect(page.getByLabel('Surface viewport container')).toBeVisible();
}

function pointLabels(page: import('@playwright/test').Page) {
  return page.locator('[aria-label^="Select point P"]');
}

function lineLabels(page: import('@playwright/test').Page) {
  return page.locator('[aria-label^="Select line L"]');
}

function surfaceLabels(page: import('@playwright/test').Page) {
  return page.locator('[aria-label^="Select surface S"]');
}

function geometrySummary(page: import('@playwright/test').Page, points: number, edges: number, surfaces: number) {
  return page.getByText(`Points: ${points} • Edges: ${edges} • Surfaces: ${surfaces}`);
}

test.describe('Surface toolbox viewport-first exact controls', () => {
  test('keeps viewport tools collapsed by default and opens precision tools on demand', async ({ page }) => {
    await openSurface(page);

    const openTools = page.getByRole('button', { name: 'Open viewport tools' });
    await expect(openTools).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move Points' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Viewport tab Precision' }).click();
    await expect(page.getByRole('button', { name: 'Collapse viewport tools' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move Points' })).toBeVisible();
  });

  test('supports HUD docking and persists the dock side', async ({ page }) => {
    await openSurface(page);

    await expect(page.getByRole('button', { name: 'Dock viewport tools right' })).toBeVisible();
    await page.getByRole('button', { name: 'Dock viewport tools right' }).click();
    await expect(page.getByRole('button', { name: 'Dock viewport tools left' })).toBeVisible();

    await page.reload();
    await openSurface(page);
    await expect(page.getByRole('button', { name: 'Dock viewport tools left' })).toBeVisible();
  });

  test('shows exact controls and keeps them gated until point selection exists', async ({ page }) => {
    await openSurface(page);

    await page.getByRole('button', { name: 'Viewport tab Precision' }).click();

    const lineButton = page.getByRole('button', { name: 'Create Line From Selection' });
    const surfaceButton = page.getByRole('button', { name: 'Create Surface From Selection' });

    await expect(lineButton).toBeVisible();
    await expect(surfaceButton).toBeVisible();
    await expect(lineButton).toBeDisabled();
    await expect(surfaceButton).toBeDisabled();
    await expect(page.getByText('Select points to unlock exact line and surface creation.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lock X' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lock Y' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lock Z' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rotate Points' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rotate Geometry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy Rotated Geometry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mirror Points X' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mirror Points Y' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mirror Geometry X' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mirror Geometry Y' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy Mirrored X' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy Mirrored Y' })).toBeVisible();
  });

  test('completes direct viewport line and surface creation after entering build modes', async ({ page }) => {
    await openSurface(page);
    await page.getByRole('button', { name: 'Viewport tab Build' }).click();
    await page.getByRole('button', { name: 'Dock viewport tools right' }).click();
    await page.getByTitle('Expand tools').click();

    const initialPointCount = await pointLabels(page).count();
    const initialLineCount = await lineLabels(page).count();
    const initialSurfaceCount = await surfaceLabels(page).count();
    await expect(geometrySummary(page, initialPointCount, initialLineCount, initialSurfaceCount)).toBeVisible();

    await page.getByRole('button', { name: 'Viewport build Line' }).click();
    await page.getByLabel('Select point P1').click({ force: true });
    await page.getByLabel('Select point P3').click({ force: true });
    await expect(lineLabels(page)).toHaveCount(initialLineCount + 1);

    await page.getByRole('button', { name: 'Viewport tab Build' }).click();
    await page.getByRole('button', { name: 'Viewport build Point' }).click();
    await page.getByRole('button', { name: 'Select surface S1', exact: true }).click({ force: true });
    await expect(pointLabels(page)).toHaveCount(initialPointCount + 1);

    await page.getByRole('button', { name: 'Viewport tab Build' }).click();
    await page.getByRole('button', { name: 'Viewport build Surface' }).click();
    await page.getByRole('button', { name: 'Viewport tab Build' }).click();
    await page.getByRole('button', { name: 'Viewport surface kind Contour' }).click();
    await page.getByLabel('Select point P1').click({ force: true });
    await page.getByLabel('Select point P2').click({ force: true });
    await page.getByLabel('Select point P3').click({ force: true });
    await page.getByLabel('Select point P4').click({ force: true });
    await page.getByLabel('Select point P1').click({ force: true });
    await expect(surfaceLabels(page)).toHaveCount(initialSurfaceCount + 1);
    await expect(pointLabels(page)).toHaveCount(initialPointCount + 1);
  });

  test('supports daisy-chain line creation directly from viewport clicks', async ({ page }) => {
    await openSurface(page);
    await page.getByRole('button', { name: 'Viewport tab Build' }).click();

    await page.getByRole('button', { name: 'Viewport build Point' }).click();
    await page.getByRole('button', { name: 'Select surface S1', exact: true }).click({ force: true });
    await expect(pointLabels(page)).toHaveCount(5);

    const initialLineCount = await lineLabels(page).count();

    await page.getByRole('button', { name: 'Viewport tab Build' }).click();
    await page.getByRole('button', { name: 'Viewport build Line' }).click();
    await page.getByRole('button', { name: 'Viewport tab Build' }).click();
    await page.getByRole('button', { name: /Daisy Chain Off/i }).click();
    await expect(page.getByRole('button', { name: /Daisy Chain On/i })).toBeVisible();

    await page.getByLabel('Select point P1').click({ force: true });
    await page.getByLabel('Select point P5').click({ force: true });
    await page.getByLabel('Select point P3').click({ force: true });

    await expect(lineLabels(page)).toHaveCount(initialLineCount + 2);
  });

  test('guides offset creation one step at a time and auto-advances after picks', async ({ page }) => {
    await openSurface(page);
    await page.getByRole('button', { name: 'Viewport tab Offset' }).click();

    await page.getByRole('button', { name: 'Start Offset Builder' }).click();
    await expect(page.getByRole('button', { name: 'Offset wizard pick Line A' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Offset wizard pick Surface A' })).toHaveCount(0);
    await expect(page.getByText(/A line.*A surface.*B line.*B surface.*place point/i)).toBeVisible();

    await page.getByRole('button', { name: 'Select line L1', exact: true }).click({ force: true });
    await expect(page.getByText('Now pick Surface A')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Offset wizard pick Surface A' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Offset wizard pick Line B' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Select surface S1', exact: true }).click({ force: true });
    await expect(page.getByText('Now pick Line B')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Offset wizard pick Line B' })).toBeVisible();

    await page.getByRole('button', { name: 'Select line L4', exact: true }).click({ force: true });
    await expect(page.getByText('Now pick Surface B')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Offset wizard pick Surface B' })).toBeVisible();

    await page.getByRole('button', { name: 'Select surface S1', exact: true }).click({ force: true });
    await expect(page.getByText('Offset previews ready. Place the crossing point.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Offset wizard place crossing' })).toBeVisible();
    await expect(page.getByText(/Crossing ready/i).first()).toBeVisible();
    await expect(page.getByText('P = (2.500, 5.000, 0.000)')).toBeVisible();
  });

  test('supports manual offset guidance without auto-arming the next picker', async ({ page }) => {
    await openSurface(page);
    await page.getByRole('button', { name: 'Viewport tab Offset' }).click();
    await page.getByRole('button', { name: 'Switch offset guidance to manual' }).click();
    await expect(page.getByText('Guided Off')).toBeVisible();

    await page.getByRole('button', { name: 'Start Offset Builder' }).click();
    await page.getByRole('button', { name: 'Select line L1', exact: true }).click({ force: true });

    await expect(page.getByRole('button', { name: 'Offset wizard pick Surface A' })).toBeVisible();
    await expect(page.getByText('Now pick Surface A')).toHaveCount(0);
    await expect(page.getByText('Click the surface that defines the offset direction for line A.')).toBeVisible();
  });

  test('closes a contour surface by re-clicking the first point', async ({ page }) => {
    await openSurface(page);
    await page.getByRole('button', { name: 'Viewport tab Build' }).click();

    const initialPointCount = await pointLabels(page).count();
    const initialSurfaceCount = await surfaceLabels(page).count();

    await page.getByRole('button', { name: 'Viewport build Surface' }).click();
    await page.getByRole('button', { name: 'Viewport tab Build' }).click();
    await page.getByRole('button', { name: 'Viewport surface kind Contour' }).click();

    await page.getByLabel('Select point P1').click({ force: true });
    await page.getByLabel('Select point P2').click({ force: true });
    await page.getByLabel('Select point P3').click({ force: true });
    await page.getByLabel('Select point P4').click({ force: true });
    await page.getByLabel('Select point P1').click({ force: true });

    await expect(surfaceLabels(page)).toHaveCount(initialSurfaceCount + 1);
    await expect(pointLabels(page)).toHaveCount(initialPointCount);
  });

  test('cascades deletion after creating new geometry', async ({ page }) => {
    await openSurface(page);
    await page.getByRole('button', { name: 'Viewport tab Build' }).click();

    await page.getByRole('button', { name: 'Viewport build Point' }).click();
    await page.getByRole('button', { name: 'Select surface S1', exact: true }).click({ force: true });
    await expect(pointLabels(page)).toHaveCount(5);

    await page.getByRole('button', { name: 'Viewport tab Build' }).click();
    await page.getByRole('button', { name: 'Viewport build Line' }).click();
    await page.getByRole('button', { name: 'Select point P1', exact: true }).click({ force: true });
    await page.getByRole('button', { name: 'Select point P5', exact: true }).click({ force: true });
    await expect(lineLabels(page)).toHaveCount(5);

    await page.getByTitle('Select entities').click();
    await page.getByRole('button', { name: 'Select point P5', exact: true }).click({ force: true });
    await page.keyboard.press('Delete');
    await expect(page.getByText('Delete Selection')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Delete' }).click();

    await expect(pointLabels(page)).toHaveCount(4);
    await expect(lineLabels(page)).toHaveCount(4);
    await expect(surfaceLabels(page)).toHaveCount(1);
  });

  test('persists beginner and expert mode controls', async ({ page }) => {
    await openSurface(page);

    const beginnerBtn = page.getByRole('button', { name: 'Beginner' }).first();
    const expertBtn = page.getByRole('button', { name: 'Expert' }).first();
    await page.getByRole('button', { name: '»' }).click();

    await expertBtn.click();
    await expect(page.getByText('Core Flow')).toBeVisible();

    await beginnerBtn.click();
    await expect(page.getByText('Core Flow')).toHaveCount(0);
  });
});
