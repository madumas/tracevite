import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Quadrilatère quelconque — classification', () => {
  test('un quadrilatère irrégulier est classé "Quadrilatère" sans sous-type', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel test');

    // Switch to Complet mode for full classification
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    // Build an irregular quadrilateral with no special properties
    // Points chosen to avoid parallelism, perpendicularity, equal sides
    // A(30,40) B(110,45) C(90,100) D(35,75)
    // AB: dx=80,dy=5 → dir≈3.6°  CD: dx=-55,dy=-25 → dir≈204° (not parallel to AB)
    // BC: dx=-20,dy=55 → dir≈110° DA: dx=-5,dy=-35 → dir≈262° (not parallel to BC)
    // Lengths: AB≈80.2 BC≈58.5 CD≈60.4 DA≈35.4 — all different
    await interactCanvas(page, testInfo, 30, 40);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 110, 45);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 90, 100);
    await interactCanvas(page, testInfo, 35, 75);
    await interactCanvas(page, testInfo, 30, 40); // close quadrilateral
    await expectSegmentCount(page, 4);
    await expectPointCount(page, 4);

    // Press Escape to deselect
    await page.keyboard.press('Escape');

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Propriétés" accordion
    await panel.locator('[data-testid="accordion-Propriétés"]').click();
    await page.waitForTimeout(200);

    const text = await panel.textContent() ?? '';

    // Should contain the generic "Quadrilatère" classification
    expect(text).toMatch(/Quadrilatère/);

    // Should NOT contain any specific quadrilateral subtype
    expect(text).not.toMatch(/Rectangle/i);
    expect(text).not.toMatch(/Carré/i);
    expect(text).not.toMatch(/Losange/i);
    expect(text).not.toMatch(/Parallélogramme/i);
    expect(text).not.toMatch(/Trapèze/i);
  });
});
