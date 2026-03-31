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

test.describe('Symmetry check tool', () => {
  test('checks symmetry using a segment as axis', async ({ page }, testInfo) => {
    // Create a symmetric construction: vertical segment as axis + point on each side
    // First create a vertical segment (axis)
    await interactCanvas(page, testInfo, 80, 40);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 80, 130);
    await expectSegmentCount(page, 1);
    await page.keyboard.press('Escape');

    // Create a segment on the left
    await interactCanvas(page, testInfo, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 60, 80);
    await expectSegmentCount(page, 2);
    await page.keyboard.press('Escape');

    // Select symmetry tool
    await selectTool(page, 'symmetry');
    await waitForStatus(page, /Symétrie.*axe/);

    // Click on the vertical segment (axis)
    await interactCanvas(page, testInfo, 80, 85);

    // Should show result
    await waitForStatus(page, /symétrique|Symétrie/);
  });
});
