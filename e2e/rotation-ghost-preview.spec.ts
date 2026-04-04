import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Rotation requires complet mode
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
});

test.describe('Rotation ghost preview', () => {
  test('preset shows preview state with Confirmer/Annuler', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);
    await page.keyboard.press('Escape');

    // Switch to rotation tool
    await page.locator('[data-testid="tool-rotation"]').click();

    // Place center
    await interactCanvas(page, testInfo, 75, 75);
    await waitForStatus(page, /angle/);

    // Click preset → enters preview state
    await page.locator('button:has-text("90°")').click();
    await waitForStatus(page, /Aperçu.*rotation.*90/);

    // Confirmer and Annuler buttons should be visible in the tool panel
    const toolPanel = page.locator('[key="rotation-angle-panel"]').or(
      page.locator('text=Confirmer').locator('..').locator('..'),
    );
    await expect(page.locator('button:has-text("Confirmer")').first()).toBeVisible();

    // The 90° preset should be highlighted (selected state)
    const btn90 = page.locator('button:has-text("90°")');
    await expect(btn90).toBeVisible();
  });

  test('Annuler returns to angle selection', async ({ page }, testInfo) => {
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième/);
    await interactCanvas(page, testInfo, 100, 50);
    await page.keyboard.press('Escape');

    await page.locator('[data-testid="tool-rotation"]').click();
    await interactCanvas(page, testInfo, 75, 75);
    await page.waitForTimeout(300);

    // Select preset
    await page.locator('button:has-text("90°")').click();
    await waitForStatus(page, /Aperçu/);

    // Cancel — use first() to avoid strict mode violation with undo button
    await page.locator('button:has-text("Annuler")').first().click();
    await page.waitForTimeout(200);

    // Back to angle selection
    await waitForStatus(page, /angle/);
  });

  test('Confirmer advances to select_figure phase', async ({ page }, testInfo) => {
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième/);
    await interactCanvas(page, testInfo, 100, 50);
    await page.keyboard.press('Escape');

    await page.locator('[data-testid="tool-rotation"]').click();
    await interactCanvas(page, testInfo, 75, 75);
    await page.waitForTimeout(300);

    await page.locator('button:has-text("90°")').click();
    await waitForStatus(page, /Aperçu/);

    await page.locator('button:has-text("Confirmer")').first().click();
    await waitForStatus(page, /Clique sur un segment/);
  });

  test('Escape cancels ghost preview', async ({ page }, testInfo) => {
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième/);
    await interactCanvas(page, testInfo, 100, 50);
    await page.keyboard.press('Escape');

    await page.locator('[data-testid="tool-rotation"]').click();
    await interactCanvas(page, testInfo, 75, 75);
    await page.waitForTimeout(300);

    await page.locator('button:has-text("180°")').click();
    await waitForStatus(page, /Aperçu/);

    await page.keyboard.press('Escape');
    await waitForStatus(page, /angle/);
  });

  test('changing preset updates preview angle', async ({ page }, testInfo) => {
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième/);
    await interactCanvas(page, testInfo, 100, 50);
    await page.keyboard.press('Escape');

    await page.locator('[data-testid="tool-rotation"]').click();
    await interactCanvas(page, testInfo, 75, 75);
    await page.waitForTimeout(300);

    // Select 90° first
    await page.locator('button:has-text("90°")').click();
    await waitForStatus(page, /90°/);

    // Change to 180°
    await page.locator('button:has-text("180°")').click();
    await waitForStatus(page, /180°/);
  });
});
