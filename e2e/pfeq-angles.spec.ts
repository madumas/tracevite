import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('PFEQ angle display by mode', () => {
  test('Simplifie shows angle classification only, no degrees', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Default mode is Simplifie
    // Build a right-angle triangle: vertices at (50,100), (100,100), (100,50)
    await interactCanvas(page, testInfo, 50, 100);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 100);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 100, 50);
    await interactCanvas(page, testInfo, 50, 100); // close triangle
    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Angles" accordion (collapsed by default)
    await panel.locator('[data-testid="accordion-Angles"]').click();
    await page.waitForTimeout(200);

    const text = await panel.textContent() ?? '';
    // In Simplifie: should show classification "(droit)" for the right angle
    expect(text).toMatch(/droit/i);
    // In Simplifie: should NOT show degree values (e.g. "90,0°" or "45°")
    // Degrees are only shown in Complet mode
    expect(text).not.toMatch(/\d+°/);
  });

  test('Complet shows degree values', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Switch to Complet mode
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    // Build the same right-angle triangle
    await interactCanvas(page, testInfo, 50, 100);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 100);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 100, 50);
    await interactCanvas(page, testInfo, 50, 100); // close triangle
    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Angles" accordion (collapsed by default)
    await panel.locator('[data-testid="accordion-Angles"]').click();
    await page.waitForTimeout(200);

    const text = await panel.textContent() ?? '';
    // In Complet: should show degree value "90" with degree symbol
    expect(text).toMatch(/90/);
    expect(text).toMatch(/°/);
  });
});
