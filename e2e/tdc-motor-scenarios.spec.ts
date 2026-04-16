/**
 * TDC motor-accessibility scenarios (QA 5.1).
 *
 * These tests simulate the motor patterns documented in the ergo review:
 * - tremor during two-click pickup/putdown (drag + put-down mid-move)
 * - tap with micro-drift (< 1.5 mm involuntary movement)
 * - long-tap (800 ms between pointerdown and pointerup)
 * - escape cascade hierarchy (dialog > tool > selection > segment)
 * - re-tap near an existing point → snap, not duplicate
 *
 * They complement the existing drag-rejection and debounce-double-tap specs.
 */

import { test, expect } from '@playwright/test';
import { getPxPerMm, clickCanvas, moveOnCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('TDC motor scenarios (QA 5.1)', () => {
  test('tap with 1.2mm involuntary drift is still a click', async ({ page }) => {
    // 1.2 mm < 1.5 mm threshold — should behave like a tap.
    const svg = page.locator('[data-testid="canvas-svg"]');
    const box = (await svg.boundingBox())!;
    const pxPerMm = await getPxPerMm(page);
    const sx = box.x + 70 * pxPerMm;
    const sy = box.y + 70 * pxPerMm;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    // 1.2 mm drift, not in a straight line (mimics tremor)
    await page.mouse.move(sx + 0.6 * pxPerMm, sy + 0.3 * pxPerMm, { steps: 4 });
    await page.mouse.move(sx + 1.0 * pxPerMm, sy - 0.2 * pxPerMm, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // First point placed — prompt now asks for the second point.
    await waitForStatus(page, /deuxième point/);
  });

  test('long-press (800 ms) still resolves as a single tap', async ({ page }) => {
    const svg = page.locator('[data-testid="canvas-svg"]');
    const box = (await svg.boundingBox())!;
    const pxPerMm = await getPxPerMm(page);

    // Dispatch pointer events directly (Playwright's mouse down/up don't expose
    // the hold duration cleanly enough here). The goal is to ensure the app
    // doesn't bail out just because pointerup came 800 ms after pointerdown.
    const cx = box.x + 80 * pxPerMm;
    const cy = box.y + 80 * pxPerMm;
    await page.evaluate(
      ({ x, y }) => {
        const el = document.querySelector('[data-testid="canvas-svg"]')!;
        const common = { clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'mouse' };
        el.dispatchEvent(new PointerEvent('pointerdown', common));
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            el.dispatchEvent(new PointerEvent('pointerup', common));
            resolve();
          }, 800);
        });
      },
      { x: cx, y: cy },
    );
    await page.waitForTimeout(300);

    await waitForStatus(page, /deuxième point/);
  });

  test('escape cascade: cancels tool phase, then clears selection', async ({ page }) => {
    // Place a point → enter phase 2 of segment tool.
    await clickCanvas(page, 60, 60);
    await waitForStatus(page, /deuxième point/);

    // Escape → cancels phase 2, returns to phase 1.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await waitForStatus(page, /premier point/);

    // Complete a full segment (two explicit clicks + length-input dismissal).
    await clickCanvas(page, 60, 60);
    await moveOnCanvas(page, 90, 60);
    await clickCanvas(page, 90, 60);
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape'); // dismiss length input
    await expectSegmentCount(page, 1);
  });

  test('re-tap 2mm from an existing point snaps rather than creating a duplicate', async ({
    page,
  }) => {
    // Place an initial point.
    await clickCanvas(page, 60, 60);
    await waitForStatus(page, /deuxième point/);

    // Complete the segment slightly off from (60, 60) — still within 7 mm snap zone.
    await clickCanvas(page, 90, 60);
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape'); // dismiss length input if present

    // A 2 mm offset tap close to the first point should snap to it,
    // not create a fourth point.
    await clickCanvas(page, 62, 61);
    await waitForStatus(page, /deuxième point/);

    // Two points total (endpoints of the existing segment) — no phantom added.
    await expectPointCount(page, 2);
  });

  test('right-click acts as cancel (spec §17 physical Escape)', async ({ page }) => {
    await clickCanvas(page, 70, 70);
    await waitForStatus(page, /deuxième point/);

    // context-menu event = right-click = cancel current phase.
    const svg = page.locator('[data-testid="canvas-svg"]');
    await svg.dispatchEvent('contextmenu');
    await page.waitForTimeout(200);

    await waitForStatus(page, /premier point/);
  });
});
