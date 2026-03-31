import { test } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
});

test.describe('Parallel tool', () => {
  test('draws parallel to a reference segment', async ({ page }, testInfo) => {
    // Create a horizontal reference segment
    await interactCanvas(page, testInfo, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 150, 80);
    await expectSegmentCount(page, 1);

    await page.keyboard.press('Escape');

    // Select parallel tool
    await selectTool(page, 'parallel');
    await waitForStatus(page, /segment de référence/);

    // Click on the reference segment body
    await interactCanvas(page, testInfo, 100, 80);
    await waitForStatus(page, /point de départ/);

    // Place start point above the reference
    await interactCanvas(page, testInfo, 60, 50);
    await waitForStatus(page, /point d'arrivée/);

    // Place end point parallel (same horizontal direction)
    await interactCanvas(page, testInfo, 140, 50);

    await expectSegmentCount(page, 2);
  });
});
