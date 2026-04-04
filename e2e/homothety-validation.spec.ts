import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Homothety tool is Complet mode only
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
});

test.describe('Homothety factor validation', () => {
  test('rejects factor 0 and negative factor', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 50);
    await interactCanvas(page, testInfo, 100, 50);
    await page.keyboard.press('Escape');
    await expectSegmentCount(page, 1);

    // Select homothety tool
    await page.locator('[data-testid="tool-homothety"]').click();
    await waitForStatus(page, /Étape 1\/3.*Agrandir/);

    // Phase 1: place center
    await interactCanvas(page, testInfo, 120, 60);
    await waitForStatus(page, /Étape 2\/3.*facteur/);

    // Phase 2: try factor 0
    const input = page.locator('#homothety-factor-input');
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill('0');

    const okBtn = page.locator('button', { hasText: 'OK' });
    await okBtn.click();
    await page.waitForTimeout(300);

    // Should still be on step 2 (factor panel still visible), no transformation happened
    await expect(input).toBeVisible();
    await expectSegmentCount(page, 1);

    // Try negative factor
    await input.fill('-1');
    await okBtn.click();
    await page.waitForTimeout(300);

    // Still on step 2, no transformation happened
    await expect(input).toBeVisible();
    await expectSegmentCount(page, 1);
  });
});
