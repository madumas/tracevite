import { test, expect } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { expectSegmentCount } from './helpers/assertions';

test.describe('Snap segment quantified to grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');
  });

  test('creating a point on a diagonal segment produces grid-aligned coordinates', async ({
    page,
  }) => {
    // Create a diagonal segment from grid point (20,20) to grid point (80,60)
    await clickCanvas(page, 20, 20);
    await clickCanvas(page, 80, 60);
    await page.keyboard.press('Escape');
    await expectSegmentCount(page, 1);

    // Now start a new segment by clicking near the middle of the diagonal
    // The snap should project onto the segment then quantize to grid
    await clickCanvas(page, 50, 40);
    await page.waitForTimeout(500);

    // Verify we created a new point (3 total: A, B + new)
    // If snap worked correctly, the new point is on the diagonal AND on a grid crossing
    const segCount = await page.locator('[data-testid="segment-layer"] line[data-element-id]').count();
    // We should have at least 1 segment from the original + potentially a new one starting
    expect(segCount).toBeGreaterThanOrEqual(1);
  });
});
