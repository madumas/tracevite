import { test } from '@playwright/test';
import { getPxPerMm } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Drag rejection (DCD motor accessibility)', () => {
  test('drag > 1.5mm does NOT create a segment', async ({ page }) => {
    const svg = page.locator('[data-testid="canvas-svg"]');
    const box = await svg.boundingBox();
    const pxPerMm = await getPxPerMm(page);

    // Simulate a drag: pointerdown, move > 1.5mm, pointerup
    const startX = box!.x + 50 * pxPerMm;
    const startY = box!.y + 80 * pxPerMm;
    const endX = startX + 5 * pxPerMm; // 5mm movement — well above 1.5mm threshold
    const endY = startY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // No point or segment should be created — drag was rejected
    await expectPointCount(page, 0);
    await expectSegmentCount(page, 0);

    // Status should still show idle (first point prompt)
    await waitForStatus(page, /premier point/);
  });

  test('micro-movement < 1.5mm IS treated as a click', async ({ page }) => {
    const svg = page.locator('[data-testid="canvas-svg"]');
    const box = await svg.boundingBox();
    const pxPerMm = await getPxPerMm(page);

    // Simulate a tiny movement: pointerdown, move < 1.5mm, pointerup
    const startX = box!.x + 50 * pxPerMm;
    const startY = box!.y + 80 * pxPerMm;
    const endX = startX + 0.5 * pxPerMm; // 0.5mm — below 1.5mm threshold
    const endY = startY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Should be treated as a click — first point placed
    await waitForStatus(page, /deuxième point/);
  });
});
