import { test, expect } from '@playwright/test';

test.describe('Consigne reste visible après zoom', () => {
  test('la bannière consigne est toujours visible après zoom avant', async ({ page }) => {
    // Naviguer avec une consigne en paramètre URL
    await page.goto('/?consigne=Construis+un+triangle');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Vérifier que la bannière consigne est visible
    const banner = page.locator('[data-testid="consigne-banner"]');
    await expect(banner).toBeVisible({ timeout: 3000 });
    await expect(banner).toContainText('Construis un triangle');

    // Zoomer deux fois
    const zoomIn = page.locator('[data-testid="zoom-in"]');
    await zoomIn.click();
    await page.waitForTimeout(300);
    await zoomIn.click();
    await page.waitForTimeout(300);

    // La bannière consigne doit toujours être visible et contenir le bon texte
    await expect(banner).toBeVisible({ timeout: 3000 });
    await expect(banner).toContainText('Construis un triangle');
  });
});
