import { test } from '@playwright/test';
import { clickCanvas, tapCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectCircleCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');

  // Circle tool is only available in complet mode — switch from simplifie
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
});

test.describe('Circle tool (two-click: center + radius)', () => {
  test('creates a circle with two clicks', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    await selectTool(page, 'circle');
    await waitForStatus(page, /centre/);

    // First click: place center
    await click(page, 80, 80);
    await waitForStatus(page, /rayon/);

    // Second click: set radius (~30mm away)
    await click(page, 110, 80);

    await expectPointCount(page, 1); // center point
    await expectCircleCount(page, 1);
  });

  test('enforces minimum radius (< 2mm ignored)', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    await selectTool(page, 'circle');

    // Place center
    await click(page, 80, 80);
    await waitForStatus(page, /rayon/);

    // Click very close to center (< 2mm) — should NOT create circle
    await click(page, 80.5, 80.5);

    // Still waiting for radius — circle was not created
    await expectCircleCount(page, 0);
  });
});
