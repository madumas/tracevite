import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Mode Simplifié ↔ Complet', () => {
  test('simplifie hides circle tool, shows more-tools', async ({ page }) => {
    // Default is simplifie
    await expect(page.locator('[data-testid="tool-circle"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="more-tools"]')).toBeVisible();
  });

  test('switching to complet shows circle and translation tools', async ({ page }) => {
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    await expect(page.locator('[data-testid="tool-circle"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-translation"]')).toBeVisible();
  });

  test('switching back to simplifie hides circle tool', async ({ page }) => {
    // Switch to complet
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await expect(page.locator('[data-testid="tool-circle"]')).toBeVisible();

    // Switch back to simplifie
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-simplifie"]').click();
    await expect(page.locator('[data-testid="tool-circle"]')).not.toBeVisible();
  });
});
