import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Estimation mode hide and reveal', () => {
  test('hides measurements, then Vérifier reveals them', async ({ page }, testInfo) => {
    // Build a segment
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);
    await page.keyboard.press('Escape');

    // Verify measurement text is visible before enabling estimation mode
    const svgTextsBefore = await page.locator('[data-testid="canvas-svg"] text').allTextContents();
    const hasMeasurementBefore = svgTextsBefore.some((t) => /\d/.test(t) && /cm|mm/.test(t));
    expect(hasMeasurementBefore).toBe(true);

    // Open settings and enable estimation mode
    await page.locator('[data-testid="settings-button"]').click();
    const dialog = page.locator('[data-testid="settings-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Find the estimation checkbox by its label text and check it
    const estimationRow = dialog.locator('div', { hasText: 'Mode estimation' }).last();
    const checkbox = estimationRow.locator('input[type="checkbox"]');
    await checkbox.check();

    // Close settings by clicking the close button
    await dialog.locator('button[aria-label="Fermer"]').click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    // Verify: estimation badge visible, measurements hidden from canvas
    await expect(page.locator('[data-testid="estimation-badge"]')).toBeVisible({ timeout: 3000 });
    const svgTextsHidden = await page.locator('[data-testid="canvas-svg"] text').allTextContents();
    const hasMeasurementHidden = svgTextsHidden.some((t) => /\d/.test(t) && /cm|mm/.test(t));
    expect(hasMeasurementHidden).toBe(false);

    // Click "Vérifier" button in the action bar
    const verifyBtn = page.locator('button', { hasText: 'Vérifier' });
    await expect(verifyBtn).toBeVisible({ timeout: 3000 });
    await verifyBtn.click();
    await page.waitForTimeout(300);

    // Measurements should now be visible again
    const svgTextsRevealed = await page.locator('[data-testid="canvas-svg"] text').allTextContents();
    const hasMeasurementRevealed = svgTextsRevealed.some((t) => /\d/.test(t) && /cm|mm/.test(t));
    expect(hasMeasurementRevealed).toBe(true);
  });
});
