import { test, expect } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.describe('Performance with many elements', () => {
  test('canvas remains responsive with 15 segments', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    const startTime = Date.now();

    // Create 15 segments programmatically (5 rows of 3, well-spaced to avoid snap)
    // Keep y values within visible canvas area (~120mm max)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const x1 = 20 + col * 60;
        const y1 = 15 + row * 22;
        const x2 = x1 + 30;
        const y2 = y1;

        await clickCanvas(page, x1, y1);
        await page.waitForTimeout(400);
        await clickCanvas(page, x2, y2);
        await page.waitForTimeout(400);

        // Escape to break chaining
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    }

    const creationTime = Date.now() - startTime;

    // Verify all 15 segments were created
    const segCount = await page
      .locator('[data-testid="segment-layer"] [data-testid^="segment-"]')
      .count();
    expect(segCount).toBe(15);

    // Creation of 15 segments should take less than 30 seconds
    expect(creationTime).toBeLessThan(30000);

    // Verify canvas is still responsive: create one more segment
    const interactionStart = Date.now();
    await clickCanvas(page, 50, 130);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 100, 130);
    const interactionTime = Date.now() - interactionStart;

    // Single segment creation should still be under 3 seconds
    expect(interactionTime).toBeLessThan(3000);

    await expectSegmentCount(page, 16);
  });

  test('undo/redo is fast with many actions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Create 5 segments (well-spaced)
    for (let i = 0; i < 5; i++) {
      await clickCanvas(page, 20 + i * 40, 50);
      await page.waitForTimeout(400);
      await clickCanvas(page, 40 + i * 40, 50);
      await page.waitForTimeout(400);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    await expectSegmentCount(page, 5);

    // Undo all 5 rapidly
    const undoStart = Date.now();
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="action-undo"]').click();
    }
    const undoTime = Date.now() - undoStart;

    // 5 undos should take less than 3 seconds
    expect(undoTime).toBeLessThan(3000);

    // Canvas should be empty
    await expectSegmentCount(page, 0);
  });
});
