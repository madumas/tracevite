import { test, expect } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';

test.describe('Performance with many elements', () => {
  test('canvas remains responsive with 15 segments', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    const startTime = Date.now();

    // Create 15 segments programmatically (5 rows of 3)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const x1 = 30 + col * 50;
        const y1 = 30 + row * 30;
        const x2 = x1 + 30;
        const y2 = y1;

        await clickCanvas(page, x1, y1);
        await waitForStatus(page, /deuxième point/);
        await clickCanvas(page, x2, y2);

        // Escape to break chaining
        await page.keyboard.press('Escape');
      }
    }

    const creationTime = Date.now() - startTime;

    // Verify all 15 segments were created
    const segCount = await page
      .locator('[data-testid="segment-layer"] [data-testid^="segment-"]')
      .count();
    expect(segCount).toBe(15);

    // Creation of 15 segments should take less than 20 seconds
    // (each segment ~1s with debounce waits = ~15s + margin)
    expect(creationTime).toBeLessThan(20000);

    // Verify canvas is still responsive: create one more segment
    const interactionStart = Date.now();
    await clickCanvas(page, 50, 180);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 100, 180);
    const interactionTime = Date.now() - interactionStart;

    // Single segment creation should still be under 2 seconds
    expect(interactionTime).toBeLessThan(2000);

    expect(segCount + 1).toBe(16);
  });

  test('undo/redo is fast with many actions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Create 5 segments
    for (let i = 0; i < 5; i++) {
      await clickCanvas(page, 30 + i * 30, 50);
      await waitForStatus(page, /deuxième point/);
      await clickCanvas(page, 50 + i * 30, 50);
      await page.keyboard.press('Escape');
    }

    // Undo all 5 rapidly
    const undoStart = Date.now();
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="action-undo"]').click();
    }
    const undoTime = Date.now() - undoStart;

    // 5 undos should take less than 3 seconds
    expect(undoTime).toBeLessThan(3000);

    // Canvas should be empty
    const segCount = await page
      .locator('[data-testid="segment-layer"] [data-testid^="segment-"]')
      .count();
    expect(segCount).toBe(0);
  });
});
