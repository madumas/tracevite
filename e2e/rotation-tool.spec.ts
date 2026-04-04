import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Rotation tool is complet mode only
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
});

test.describe('Rotation tool', () => {
  test('rotates a triangle by 90° using preset button', async ({ page }, testInfo) => {
    // Create a triangle
    await interactCanvas(page, testInfo, 50, 50);
    await interactCanvas(page, testInfo, 90, 50);
    await interactCanvas(page, testInfo, 70, 80);
    await interactCanvas(page, testInfo, 50, 50); // close
    await page.keyboard.press('Escape');
    await expectSegmentCount(page, 3);

    // Select rotation tool
    await page.locator('[data-testid="tool-rotation"]').click();
    await waitForStatus(page, /Étape 1\/3.*Rotation/);

    // Phase 1: place center
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /Étape 2\/3.*angle/);

    // Phase 2: angle panel should appear — click 90° preset → shows ghost preview
    const btn90 = page.locator('button', { hasText: '90°' });
    await expect(btn90).toBeVisible({ timeout: 3000 });
    await btn90.click();
    await waitForStatus(page, /Aperçu/);
    // Confirm the preview to advance to phase 3
    await page.locator('button:has-text("Confirmer")').click();
    await waitForStatus(page, /Étape 3\/3.*segment/);

    // Phase 3: click on a segment of the triangle to rotate it
    await interactCanvas(page, testInfo, 70, 50);
    await page.waitForTimeout(1000); // wait for animation if enabled

    // Original 3 segments + 3 rotated segments = 6
    await expectSegmentCount(page, 6);
  });

  test('rotates using free angle input + OK button', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 60);
    await interactCanvas(page, testInfo, 100, 60);
    await page.keyboard.press('Escape');
    await expectSegmentCount(page, 1);

    // Select rotation tool
    await page.locator('[data-testid="tool-rotation"]').click();

    // Place center
    await interactCanvas(page, testInfo, 50, 60);

    // Type angle in input field + click OK → shows ghost preview
    const input = page.locator('#rotation-angle-input');
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill('45');

    const okBtn = page.locator('button', { hasText: 'OK' });
    await okBtn.click();
    await waitForStatus(page, /Aperçu/);
    // Confirm the preview
    await page.locator('button:has-text("Confirmer")').click();
    await waitForStatus(page, /Étape 3\/3/);

    // Click on the segment
    await interactCanvas(page, testInfo, 75, 60);
    await page.waitForTimeout(1000);

    await expectSegmentCount(page, 2);
  });

  test('shows 5 preset buttons (60, 90, 120, 180, 270)', async ({ page }, testInfo) => {
    await page.locator('[data-testid="tool-rotation"]').click();
    await interactCanvas(page, testInfo, 50, 50); // place center

    // Check all 5 presets are visible
    for (const deg of ['60°', '90°', '120°', '180°', '270°']) {
      await expect(page.locator('button', { hasText: deg })).toBeVisible({ timeout: 3000 });
    }
  });

  test('escape goes back through phases', async ({ page }, testInfo) => {
    await page.locator('[data-testid="tool-rotation"]').click();
    await waitForStatus(page, /Étape 1\/3/);

    // Place center → phase 2
    await interactCanvas(page, testInfo, 60, 60);
    await waitForStatus(page, /Étape 2\/3/);

    // Escape → back to phase 1
    await page.keyboard.press('Escape');
    await waitForStatus(page, /Étape 1\/3/);
  });
});
