import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Switch to complet mode (perpendicular tool hidden behind "more tools" in simplifie)
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
});

test.describe('Perpendicular tool', () => {
  test('draws perpendicular to a reference segment', async ({ page }, testInfo) => {
    // Create a horizontal reference segment
    await interactCanvas(page, testInfo, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 150, 80);
    await expectSegmentCount(page, 1);

    // Escape chaining
    await page.keyboard.press('Escape');

    // Select perpendicular tool
    await selectTool(page, 'perpendicular');
    await waitForStatus(page, /segment de référence/);

    // Click on the reference segment body (midpoint area)
    await interactCanvas(page, testInfo, 100, 80);
    await waitForStatus(page, /point de départ/);

    // Place start point on the segment
    await interactCanvas(page, testInfo, 100, 80);
    await waitForStatus(page, /point d'arrivée/);

    // Place end point vertically (perpendicular direction)
    await interactCanvas(page, testInfo, 100, 40);

    // Reference segment + perpendicular segment (+ possibly auto-intersection segment)
    const segCount = await page.locator('[data-testid="segment-layer"] [data-testid^="segment-"]').count();
    expect(segCount).toBeGreaterThanOrEqual(2);
  });
});
