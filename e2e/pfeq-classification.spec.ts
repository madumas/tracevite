import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('PFEQ figure classification', () => {
  test('equilateral triangle classified in Complet mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Switch to Complet mode for full classification
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    // Build an approximately equilateral triangle using grid-aligned points
    // Side ~ 40mm, height ~ 34.6mm. Points: (100,100), (140,100), (120,65)
    // AB=40, AC=sqrt(400+1225)≈40.3, BC≈40.3 → within ±1mm tolerance → equilateral
    await interactCanvas(page, testInfo, 100, 100);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 140, 100);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 120, 65);
    await interactCanvas(page, testInfo, 100, 100); // close triangle
    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Propriétés" accordion (collapsed by default)
    await panel.locator('[data-testid="accordion-Propriétés"]').click();
    await page.waitForTimeout(200);

    const text = await panel.textContent();
    // Should classify as equilateral triangle
    expect(text).toMatch(/équilatéral/i);
  });

  test('square classified correctly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Switch to Complet mode
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    // Build a square: 40mm sides at grid-aligned points
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 50);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 90, 90);
    await interactCanvas(page, testInfo, 50, 90);
    await interactCanvas(page, testInfo, 50, 50); // close square
    await expectSegmentCount(page, 4);
    await expectPointCount(page, 4);

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Propriétés" accordion (collapsed by default)
    await panel.locator('[data-testid="accordion-Propriétés"]').click();
    await page.waitForTimeout(200);

    const text = await panel.textContent();
    // Should classify as "Carre"
    expect(text).toMatch(/Carré/i);
  });
});
