import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus, openClassSettings, closeSettings } from './helpers/toolbar';
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
    const dialog = await openClassSettings(page);

    // Find the estimation checkbox by its label text and check it
    const estimationRow = page.getByText('Mode estimation').locator('..');
    await estimationRow.locator('input[type="checkbox"]').check();

    // Close settings
    await closeSettings(page);

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
