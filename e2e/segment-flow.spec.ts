import { test, expect } from '@playwright/test';
import { clickCanvas, tapCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Segment creation flow', () => {
  test('creates a segment with two clicks', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    await waitForStatus(page, /premier point/);

    await click(page, 50, 50);
    await waitForStatus(page, /deuxième point/);

    await click(page, 100, 50);
    await expectPointCount(page, 2);
    await expectSegmentCount(page, 1);
  });

  test('chains segments and closes a triangle', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // First segment
    await click(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await click(page, 100, 50);
    await expectSegmentCount(page, 1);

    // Wait for chaining mode
    await waitForStatus(page, /Continue/);

    // Second segment (chained from last point)
    await click(page, 75, 93);
    await expectPointCount(page, 3);
    await expectSegmentCount(page, 2);

    // Third segment — close back to first point (should snap)
    await click(page, 50, 50);
    await expectPointCount(page, 3);
    await expectSegmentCount(page, 3);

    // Verify triangle closed: 3 segments, 3 points (not 4 — last point snapped to first)
    // The properties panel may be collapsed by default, so we verify the geometry instead
    await expectPointCount(page, 3);
    await expectSegmentCount(page, 3);
  });
});
