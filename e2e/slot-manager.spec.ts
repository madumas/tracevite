import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Slot Manager (multi-construction)', () => {
  test('opens manager and creates a new slot', async ({ page }, testInfo) => {
    // Create a segment in the default slot
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Open slot manager
    await page.locator('[data-testid="slot-manager-btn"]').click();
    await expect(page.locator('[data-testid="slot-manager"]')).toBeVisible({ timeout: 3000 });

    // Create new slot
    await page.locator('[data-testid="slot-new"]').click();

    // New slot should be active — canvas is empty
    await page.keyboard.press('Escape'); // close manager if still open
    await expectSegmentCount(page, 0);
    await expectPointCount(page, 0);
  });

  test('new slot starts with empty canvas', async ({ page }, testInfo) => {
    // Create content in default slot
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Open manager
    await page.locator('[data-testid="slot-manager-btn"]').click();
    await expect(page.locator('[data-testid="slot-manager"]')).toBeVisible();

    // Create new slot — should switch to empty canvas
    await page.locator('[data-testid="slot-new"]').click();
    await page.keyboard.press('Escape');

    await expectSegmentCount(page, 0);
    await expectPointCount(page, 0);
  });
});
