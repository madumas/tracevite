import { test } from '@playwright/test';
import { clickCanvas, tapCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Move tool (two-click pick-up/put-down)', () => {
  test('moves a point to a new position', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create a segment first
    await click(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await click(page, 100, 50);
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);

    // Switch to move tool
    await selectTool(page, 'move');
    await waitForStatus(page, /ramasser/);

    // Pick up the first point
    await click(page, 50, 50);
    await waitForStatus(page, /déposer/);

    // Put down at new position
    await click(page, 50, 100);
    await waitForStatus(page, /ramasser/);

    // Still 2 points and 1 segment
    await expectPointCount(page, 2);
    await expectSegmentCount(page, 1);
  });
});
