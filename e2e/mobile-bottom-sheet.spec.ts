import { test, expect } from '@playwright/test';

test.describe('Mobile bottom sheet panel', () => {
  test('panel opens as bottom sheet on narrow viewport', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile iPad', 'Bottom sheet is narrow-viewport only');

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Open panel
    await page.locator('[data-testid="panel-toggle"]').click();

    // Bottom sheet should be visible with bottom: 0 positioning
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Close button should be 44x44 minimum
    const closeBtn = page.locator('button[aria-label="Fermer"]');
    await expect(closeBtn).toBeVisible();
    const box = await closeBtn.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('backdrop click closes bottom sheet', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile iPad', 'Bottom sheet is narrow-viewport only');

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    await page.locator('[data-testid="panel-toggle"]').click();
    await expect(page.locator('[data-testid="properties-panel"]')).toBeVisible({ timeout: 3000 });

    // Click on backdrop area (top of screen, above the bottom sheet)
    await page.mouse.click(100, 50);
    await page.waitForTimeout(300);

    // Panel should be collapsed
    await expect(page.locator('[data-testid="properties-panel"]')).not.toBeVisible({ timeout: 3000 });
  });
});
