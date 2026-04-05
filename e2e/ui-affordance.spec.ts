import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('UI affordance improvements', () => {
  test('mode selector has a chevron indicator', async ({ page }) => {
    const modeSelector = page.locator('[data-testid="mode-selector"]');
    await expect(modeSelector).toBeVisible();

    // Chevron element should exist inside the mode selector
    const chevron = page.locator('[data-testid="mode-chevron"]');
    await expect(chevron).toBeVisible();
  });

  test('zoom level badge appears when zoomed and resets on click', async ({ page }) => {
    const zoomLevel = page.locator('[data-testid="zoom-level"]');

    // Initial zoom may not be 100% (computed from viewport). If visible, click to reset.
    if (await zoomLevel.isVisible().catch(() => false)) {
      await zoomLevel.click();
      await page.waitForTimeout(300);
    }

    // At 100% zoom, the zoom level indicator should be hidden
    await expect(zoomLevel).not.toBeVisible();

    // Zoom in
    const zoomIn = page.locator('[data-testid="zoom-in"]');
    await zoomIn.click();
    await page.waitForTimeout(300);

    // After zooming in, the zoom level should now be visible
    await expect(zoomLevel).toBeVisible({ timeout: 3000 });
    const text = await zoomLevel.textContent();
    // Should show a percentage greater than 100%
    expect(text).toMatch(/\d+\s*%/);

    // Click the zoom indicator to reset to 100%
    await zoomLevel.click();
    await page.waitForTimeout(300);
    await expect(zoomLevel).not.toBeVisible();
  });

});
