import { test, expect } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

// NOTE: No IndexedDB cleanup here — this test verifies persistence across reload.

test.describe('Auto-save and persistence', () => {
  test('restores construction after page reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Create a segment
    await clickCanvas(page, 60, 60);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 120, 60);
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);

    // Wait for auto-save to complete (2s debounce + write time)
    await page.waitForTimeout(3000);

    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Verify construction is restored
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);
  });
});
