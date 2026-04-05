import { test } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Numbered steps in status bar', () => {
  test('Segment tool shows Étape 1/2 and 2/2', async ({ page }, testInfo) => {
    await waitForStatus(page, /Étape 1\/2.*Segment/);
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /Étape 2\/2.*Segment/);
  });

  test('Reflection tool shows Étape 1/2 and 2/2', async ({ page }, testInfo) => {
    await selectTool(page, 'reflection');
    await waitForStatus(page, /Étape 1\/2.*Réflexion/);

    // Define axis (2 clicks)
    await interactCanvas(page, testInfo, 80, 30);
    await waitForStatus(page, /Étape 1\/2.*deuxième/);
    await interactCanvas(page, testInfo, 80, 120);
    await waitForStatus(page, /Étape 2\/2.*Réflexion/);
  });

  test('Rotation tool shows Étape 1/3, 2/3, 3/3 (complet mode)', async ({ page }, testInfo) => {
    // Switch to complet
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-testid="tool-rotation"]').click();
    await waitForStatus(page, /Étape 1\/3.*Rotation/);

    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /Étape 2\/3.*angle/);

    // Click 90° preset → advances directly to phase 3
    await page.locator('button', { hasText: '90°' }).click();
    await waitForStatus(page, /Étape 3\/3.*segment/);
  });

  test('Translation tool shows Étape 1/3, 2/3, 3/3 (complet mode)', async ({ page }, testInfo) => {
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await page.waitForTimeout(300);

    await selectTool(page, 'translation');
    await waitForStatus(page, /Étape 1\/3.*Translation/);

    await interactCanvas(page, testInfo, 30, 30);
    await waitForStatus(page, /Étape 2\/3.*Translation/);

    await interactCanvas(page, testInfo, 60, 30);
    await waitForStatus(page, /Étape 3\/3.*Translation/);
  });

  test('Circle tool shows Étape 1/2 and 2/2 (complet mode)', async ({ page }, testInfo) => {
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-testid="tool-circle"]').click();
    await waitForStatus(page, /Étape 1\/2.*Cercle/);

    await interactCanvas(page, testInfo, 80, 70);
    await waitForStatus(page, /Étape 2\/2.*Cercle/);
  });

  test('Move tool shows Étape 1/2 (simplifié mode)', async ({ page }) => {
    await selectTool(page, 'move');
    await waitForStatus(page, /Étape 1\/2.*Déplacer/);
  });

  test('Frise tool shows macro-steps 1/3, 2/3, 3/3 (complet mode)', async ({ page }, testInfo) => {
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await page.waitForTimeout(300);

    // Create a segment first
    await interactCanvas(page, testInfo, 40, 60);
    await interactCanvas(page, testInfo, 80, 60);
    await page.keyboard.press('Escape');

    await selectTool(page, 'frieze');
    await waitForStatus(page, /Étape 1\/3.*Frise/);

    // Select the segment
    await interactCanvas(page, testInfo, 60, 60);
    await waitForStatus(page, /Étape 2\/3.*Frise/);
  });
});
