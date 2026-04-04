import { test } from '@playwright/test';
import { getPxPerMm } from './helpers/canvas';
import { expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Debounce double-tap (150ms CLICK_DEBOUNCE_MS)', () => {
  test.fixme('deux clics rapides au même endroit ne créent qu\'un seul point', async ({ page }) => {
    const svg = page.locator('[data-testid="canvas-svg"]');
    const box = await svg.boundingBox();
    if (!box) throw new Error('SVG bounding box not found');

    const pxPerMm = await getPxPerMm(page);
    const x = box.x + 80 * pxPerMm;
    const y = box.y + 80 * pxPerMm;

    // Dispatch two rapid pointerdown/pointerup pairs via JS (< 150ms gap guaranteed)
    await page.evaluate(
      ({ cx, cy }) => {
        const el = document.querySelector('[data-testid="canvas-svg"]')!;
        for (let i = 0; i < 2; i++) {
          el.dispatchEvent(
            new PointerEvent('pointerdown', { clientX: cx, clientY: cy, bubbles: true, pointerId: 1 }),
          );
          el.dispatchEvent(
            new PointerEvent('pointerup', { clientX: cx, clientY: cy, bubbles: true, pointerId: 1 }),
          );
        }
      },
      { cx: x, cy: y },
    );

    // Wait for debounce + React state to settle
    await page.waitForTimeout(500);

    // Only one point should have been created, not two
    await expectPointCount(page, 1);
  });
});
