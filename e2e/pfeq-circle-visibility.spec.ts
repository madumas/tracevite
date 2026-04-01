import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('PFEQ circle tool visibility per mode', () => {
  test('circle tool is NOT visible in Simplifie mode', async ({ page }) => {
    // Default mode is Simplifie
    // Circle tool should not be in the toolbar at all
    await expect(page.locator('[data-testid="tool-circle"]')).not.toBeVisible();

    // Even if "more tools" exists, circle should not appear when clicked
    const moreTools = page.locator('[data-testid="more-tools"]');
    if (await moreTools.isVisible()) {
      await moreTools.click();
      await page.waitForTimeout(300);
      // Circle tool should still not be visible in expanded toolbar
      await expect(page.locator('[data-testid="tool-circle"]')).not.toBeVisible();
    }
  });

  test('circle tool IS visible in Complet mode', async ({ page }) => {
    // Switch to Complet mode
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    // Circle tool should now be visible in the toolbar
    await expect(page.locator('[data-testid="tool-circle"]')).toBeVisible({ timeout: 3000 });
  });

  test('circle tool disappears when switching back to Simplifie', async ({ page }) => {
    // Switch to Complet
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await expect(page.locator('[data-testid="tool-circle"]')).toBeVisible({ timeout: 3000 });

    // Switch back to Simplifie
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-simplifie"]').click();

    // Circle tool should be hidden again
    await expect(page.locator('[data-testid="tool-circle"]')).not.toBeVisible();
  });
});
