import { test } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop Chrome', 'Shift constraint is keyboard-only');
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Shift angle constraint (15°)', () => {
  test('toggles constraint on and off during segment construction', async ({ page }) => {
    // Place first point
    await clickCanvas(page, 50, 80);
    await waitForStatus(page, /deuxième point/);

    // Press Shift to activate constraint
    await page.keyboard.press('Shift');
    await waitForStatus(page, /Contrainte 15°/);

    // Press Shift again to deactivate
    await page.keyboard.press('Shift');

    // Status should no longer mention constraint
    const status = await page.locator('[data-testid="status-bar"]').textContent();
    if (status?.includes('Contrainte')) {
      throw new Error('Constraint should be deactivated');
    }

    // Complete the segment
    await clickCanvas(page, 100, 80);
    await expectSegmentCount(page, 1);
  });
});
