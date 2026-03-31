import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { clickAction, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('New construction confirmation', () => {
  test('clears canvas after confirmation', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Click new construction
    await clickAction(page, 'new');

    // Confirm dialog should appear
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();

    // Confirm
    await page.locator('[data-testid="confirm-dialog-confirm"]').click();

    // Canvas should be empty
    await expectSegmentCount(page, 0);
    await expectPointCount(page, 0);
  });

  test('cancels and keeps construction', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Click new construction
    await clickAction(page, 'new');
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();

    // Cancel
    await page.locator('[data-testid="confirm-dialog-cancel"]').click();

    // Canvas should still have content
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);
  });
});
