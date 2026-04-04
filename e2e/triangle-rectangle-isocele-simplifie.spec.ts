import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Triangle rectangle isocèle — classification par mode', () => {
  test('Simplifié affiche une seule classification, Complet les cumule', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel test');

    // Default mode is Simplifié
    // Build a right isosceles triangle: (50,50), (90,50), (50,90)
    // Two equal legs of 40mm, right angle at (50,50)
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 50);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 50, 90);
    await interactCanvas(page, testInfo, 50, 50); // close triangle
    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Press Escape to deselect
    await page.keyboard.press('Escape');

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Propriétés" accordion
    await panel.locator('[data-testid="accordion-Propriétés"]').click();
    await page.waitForTimeout(200);

    // In Simplifié mode, hideProperties defaults to true — reveal them first
    const revealBtn = page.locator('[data-testid="verify-properties-btn"]');
    if (await revealBtn.isVisible()) {
      await revealBtn.click();
      await page.waitForTimeout(200);
    }

    const textSimplifie = await panel.textContent() ?? '';

    // In Simplifié: only the most specific single classification
    // Should show "rectangle" (the most specific)
    expect(textSimplifie).toMatch(/rectangle/i);
    // Should NOT additionally show "isocèle" — single classification only
    expect(textSimplifie).not.toMatch(/isocèle/i);

    // Now switch to Complet mode (also sets hideProperties to false)
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await page.waitForTimeout(300);

    const textComplet = await panel.textContent() ?? '';

    // In Complet: cumulative classification — should show both
    expect(textComplet).toMatch(/rectangle/i);
    expect(textComplet).toMatch(/isocèle/i);
  });
});
