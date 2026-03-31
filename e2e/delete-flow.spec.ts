import { test } from '@playwright/test';
import { clickCanvas, tapCanvas } from './helpers/canvas';
import { clickAction, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Delete with micro-confirmation', () => {
  test('deletes a point with micro-confirmation (two clicks)', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create a segment (2 points)
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await click(page, 100, 80);
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);

    // Enter delete mode
    await clickAction(page, 'delete');
    await waitForStatus(page, /Supprimer/);

    // First click on point A — shows confirmation
    await click(page, 50, 80);
    await waitForStatus(page, /confirmer/);

    // Second click on same point — confirm deletion (debounce bypassed)
    await click(page, 50, 80);

    // Point A and connected segment are deleted
    await expectPointCount(page, 1);
  });

  test('cancels delete when clicking empty space', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create a segment
    await click(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await click(page, 100, 50);
    await expectSegmentCount(page, 1);

    // Enter delete mode
    await clickAction(page, 'delete');
    await waitForStatus(page, /Supprimer/);

    // Click on segment to select it
    await click(page, 75, 50);
    await waitForStatus(page, /confirmer/);

    // Click on empty space instead of confirming
    await click(page, 150, 150);

    // Segment should still exist
    await expectSegmentCount(page, 1);
  });
});
