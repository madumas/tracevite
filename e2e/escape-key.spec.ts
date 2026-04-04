import { test } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { selectTool, clickAction, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Escape key — hierarchical cancel (panic button)', () => {
  test('cancels segment tool mid-gesture', async ({ page }) => {
    // Place first point of a segment
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);

    // Press Escape — should cancel the gesture, back to idle
    await page.keyboard.press('Escape');
    await waitForStatus(page, /premier point/);

    // No segment was created
    await expectSegmentCount(page, 0);
  });

  test('deselects element on Escape', async ({ page }) => {
    // Create a segment first
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 100, 50);
    await expectSegmentCount(page, 1);

    // Select the segment via Select tool
    await selectTool(page, 'select');
    await clickCanvas(page, 75, 50);

    // Press Escape — should deselect
    await page.keyboard.press('Escape');

    // Segment still exists
    await expectSegmentCount(page, 1);
  });

  test('cancels move tool mid-gesture', async ({ page }) => {
    // Create a segment
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 100, 50);
    await expectSegmentCount(page, 1);

    // Pick up a point
    await selectTool(page, 'move');
    await waitForStatus(page, /ramasser/);
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /déposer/);

    // Press Escape — should cancel the move, point stays in place
    await page.keyboard.press('Escape');
    await waitForStatus(page, /ramasser/);
  });
});
