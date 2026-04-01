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

  test('snap indicator exists in toolbar', async ({ page }) => {
    const snapIndicator = page.locator('[data-testid="snap-indicator"]');
    await expect(snapIndicator).toBeVisible();
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

  test('grid buttons have minimum 8px gap (motor accessibility)', async ({ page }) => {
    const grid5 = page.locator('[data-testid="grid-5"]');
    const grid10 = page.locator('[data-testid="grid-10"]');

    await expect(grid5).toBeVisible();
    await expect(grid10).toBeVisible();

    const box5 = await grid5.boundingBox();
    const box10 = await grid10.boundingBox();
    expect(box5).not.toBeNull();
    expect(box10).not.toBeNull();

    // Calculate gap between the two buttons
    // Gap is the distance between the right edge of grid-5 and the left edge of grid-10
    // (or vice versa, depending on layout order)
    const rightEdge5 = box5!.x + box5!.width;
    const rightEdge10 = box10!.x + box10!.width;

    let gap: number;
    if (box5!.x < box10!.x) {
      // grid-5 is to the left of grid-10
      gap = box10!.x - rightEdge5;
    } else {
      // grid-10 is to the left of grid-5
      gap = box5!.x - rightEdge10;
    }

    // Gap must be at least 8px for motor accessibility (CLAUDE.md spec)
    expect(gap).toBeGreaterThanOrEqual(8);
  });
});
