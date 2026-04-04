import { test, expect } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Hiérarchie Escape complète : dialogue → action → sélection → outil', () => {
  test('ferme le dialogue de paramètres', async ({ page }) => {
    // Ouvrir les paramètres
    await page.locator('[data-testid="settings-button"]').click();
    await page.locator('[data-testid="settings-dialog"]').waitFor();
    await expect(page.locator('[data-testid="settings-dialog"]')).toBeVisible();

    // Appuyer sur Escape
    await page.keyboard.press('Escape');

    // Le dialogue doit être fermé
    await expect(page.locator('[data-testid="settings-dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('annule l\'action en cours (segment à mi-chemin)', async ({ page }) => {
    // Placer le premier point d'un segment
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);

    // Appuyer sur Escape — doit annuler le geste
    await page.keyboard.press('Escape');

    // Retour à l'état initial (premier point)
    await waitForStatus(page, /premier point/);

    // Aucun segment créé
    await expectSegmentCount(page, 0);
  });

  test('désélectionne l\'élément sélectionné', async ({ page }) => {
    // Créer un segment
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 100, 50);
    await expectSegmentCount(page, 1);

    // Switch to Move tool, then click segment to select it
    await selectTool(page, 'move');
    await page.waitForTimeout(200);
    await clickCanvas(page, 75, 50);
    await page.waitForTimeout(300);

    // Appuyer sur Escape — doit désélectionner
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Status bar should show move tool idle state
    const statusText = await page.locator('[data-testid="status-bar"]').textContent() ?? '';
    expect(statusText).toMatch(/ramasser|Déplacer/i);
  });
});
