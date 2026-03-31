import { test } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Reflection tool', () => {
  test('reflects a segment across a vertical axis', async ({ page }, testInfo) => {
    // Create a segment on the left side
    await interactCanvas(page, testInfo, 40, 60);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 80, 60);
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);

    await page.keyboard.press('Escape');

    // Select reflection tool
    await selectTool(page, 'reflection');
    await waitForStatus(page, /axe de symétrie/);

    // Define vertical axis with 2 clicks
    await interactCanvas(page, testInfo, 110, 30);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 110, 130);

    // Now waiting for element to reflect
    await waitForStatus(page, /figure|refléter|élément/);

    // Click on the segment to reflect it
    await interactCanvas(page, testInfo, 60, 60);

    // Should have: original 2 points + axis 2 points + reflected 2 points = 6
    // Segments: original 1 + reflected 1 = 2 (axis is not a segment in state)
    // Note: axis might or might not be added as segment depending on implementation
    // At minimum, expect more segments than before
    await expectSegmentCount(page, 2);
  });
});
