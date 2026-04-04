import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Classification « presque carré » — near-miss', () => {
  test('un quadrilatère avec un côté trop court est rectangle, pas carré', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Passer en mode Complet pour la classification complète
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    // Construire un rectangle (pas un carré) :
    // A(50,50) → B(100,50) = 50mm horizontal
    // B(100,50) → C(100,80) = 30mm vertical
    // C(100,80) → D(50,80) = 50mm horizontal
    // D(50,80) → A(50,50) = 30mm (fermeture)
    // Angles droits → Rectangle, mais 50≠30 → pas Carré
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 100, 80);
    await interactCanvas(page, testInfo, 50, 80);
    await interactCanvas(page, testInfo, 50, 50); // fermer le quadrilatère
    await expectSegmentCount(page, 4);
    await expectPointCount(page, 4);

    // Ouvrir le panneau de propriétés
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Déplier l'accordéon « Propriétés »
    await panel.locator('[data-testid="accordion-Propriétés"]').click();
    await page.waitForTimeout(200);

    const text = await panel.textContent();

    // Doit être classé comme Rectangle (4 angles droits)
    expect(text).toMatch(/Rectangle/i);

    // Ne doit PAS être classé comme Carré (côtés inégaux au-delà de la tolérance)
    expect(text).not.toMatch(/Carré/i);
  });
});
