import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Bouton « Afficher les propriétés » (pas « Vérifier »)', () => {
  test('le bouton dit "Afficher" et non "Vérifier"', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel test');

    // Build a triangle: (50,50), (100,50), (75,90), close to (50,50)
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 75, 90);
    await interactCanvas(page, testInfo, 50, 50); // close triangle
    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Press Escape to deselect
    await page.keyboard.press('Escape');

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Propriétés" accordion (toggle is inside this section)
    await panel.locator('[data-testid="accordion-Propriétés"]').click();
    await page.waitForTimeout(200);

    // In Simplifié mode, hideProperties defaults to true,
    // so the "Afficher les propriétés" button should already be visible
    // (no need to manually toggle — it's on by default)
    const verifyBtn = page.locator('[data-testid="verify-properties-btn"]');
    await expect(verifyBtn).toBeVisible({ timeout: 3000 });

    // Button text must say "Afficher" — not "Vérifier"
    const btnText = await verifyBtn.textContent() ?? '';
    expect(btnText).toMatch(/Afficher/);
    expect(btnText).not.toMatch(/Vérifier/i);

    // Clicking the button should reveal properties, without any evaluation message
    await verifyBtn.click();
    await page.waitForTimeout(300);

    // After clicking, properties should be visible again (toggle unchecked)
    const panelText = await panel.textContent() ?? '';
    // The figure classification should now be visible
    expect(panelText).toMatch(/Triangle/i);
    // No evaluation/correction language should appear
    expect(panelText).not.toMatch(/Bonne réponse|Mauvaise réponse|Correct|Incorrect|Bravo/i);
  });
});
