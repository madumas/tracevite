import { test, expect } from '@playwright/test';

test.describe('Consigne banner (teacher instructions)', () => {
  test('displays consigne from URL parameter', async ({ page }) => {
    await page.goto('/?consigne=Trace%20un%20carr%C3%A9%20de%205%20cm');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    const banner = page.locator('[data-testid="consigne-banner"]');
    await expect(banner).toBeVisible({ timeout: 3000 });
    await expect(banner).toContainText('Trace un carré de 5 cm');
  });

  test('dismiss and re-show consigne', async ({ page }) => {
    await page.goto('/?consigne=Construis%20un%20triangle%20rectangle');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Banner should be visible
    const banner = page.locator('[data-testid="consigne-banner"]');
    await expect(banner).toBeVisible({ timeout: 3000 });

    // Dismiss it
    await page.locator('[data-testid="consigne-close"]').click();
    await expect(banner).not.toBeVisible({ timeout: 3000 });

    // Re-show via "Voir la consigne" button
    await page.locator('[data-testid="consigne-show"]').click();
    await expect(banner).toBeVisible({ timeout: 3000 });
  });
});
