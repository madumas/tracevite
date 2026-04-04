import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Homothety tool is complet mode only
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
});

test.describe('Homothety (Agrandir/Réduire) tool', () => {
  test('scales a segment by factor 2 using preset', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 40, 60);
    await interactCanvas(page, testInfo, 80, 60);
    await page.keyboard.press('Escape');
    await expectSegmentCount(page, 1);

    // Select homothety tool
    await page.locator('[data-testid="tool-homothety"]').click();
    await waitForStatus(page, /Étape 1\/3.*Agrandir/);

    // Phase 1: place center
    await interactCanvas(page, testInfo, 40, 60);
    await waitForStatus(page, /Étape 2\/3.*facteur/);

    // Phase 2: factor panel — click ×2 preset → shows ghost preview
    const btn2 = page.locator('button', { hasText: '×2' });
    await expect(btn2).toBeVisible({ timeout: 3000 });
    await btn2.click();
    await waitForStatus(page, /Aperçu/);
    // Confirm the preview
    await page.locator('button:has-text("Confirmer")').click();
    await waitForStatus(page, /Étape 3\/3/);

    // Phase 3: click on the segment to scale
    await interactCanvas(page, testInfo, 60, 60);
    await page.waitForTimeout(1000);

    // Original + scaled = 2 segments
    await expectSegmentCount(page, 2);
  });

  test('scales using free input + OK button', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 40, 60);
    await interactCanvas(page, testInfo, 80, 60);
    await page.keyboard.press('Escape');

    await page.locator('[data-testid="tool-homothety"]').click();
    await interactCanvas(page, testInfo, 40, 60); // center

    // Type factor + OK → shows ghost preview
    const input = page.locator('#homothety-factor-input');
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill('3');

    const okBtn = page.locator('button', { hasText: 'OK' });
    await okBtn.click();
    await waitForStatus(page, /Aperçu/);
    await page.locator('button:has-text("Confirmer")').click();

    await interactCanvas(page, testInfo, 60, 60);
    await page.waitForTimeout(1000);

    await expectSegmentCount(page, 2);
  });

  test('shows 3 preset buttons (×0,5 ×2 ×3)', async ({ page }, testInfo) => {
    await page.locator('[data-testid="tool-homothety"]').click();
    await interactCanvas(page, testInfo, 50, 50);

    for (const label of ['×0,5', '×2', '×3']) {
      await expect(page.locator('button', { hasText: label })).toBeVisible({ timeout: 3000 });
    }
  });

  test('status bar shows "centre d\'agrandissement"', async ({ page }, testInfo) => {
    await page.locator('[data-testid="tool-homothety"]').click();
    await waitForStatus(page, /centre d'agrandissement/);
  });
});
