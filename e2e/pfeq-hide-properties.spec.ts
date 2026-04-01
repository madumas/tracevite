import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('PFEQ hide properties toggle', () => {
  test('hides figure name but keeps segment lengths visible', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Switch to Complet mode so figure names are fully shown
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    // Build a rectangle: 40mm x 20mm at grid-aligned points
    await interactCanvas(page, testInfo, 50, 60);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 60);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 90, 80);
    await interactCanvas(page, testInfo, 50, 80);
    await interactCanvas(page, testInfo, 50, 60); // close rectangle
    await expectSegmentCount(page, 4);
    await expectPointCount(page, 4);

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Propriétés" accordion (collapsed by default)
    await panel.locator('[data-testid="accordion-Propriétés"]').click();
    await page.waitForTimeout(200);

    // Before toggling: verify figure name is visible
    const textBefore = await panel.textContent() ?? '';
    expect(textBefore).toMatch(/Rectangle|Carré/i);

    // Verify segment lengths are present (cm or mm values)
    expect(textBefore).toMatch(/\d+,?\d*\s*(cm|mm)/);

    // Toggle "hide properties"
    const hideToggle = page.locator('[data-testid="hide-properties-toggle"]');
    await expect(hideToggle).toBeVisible();
    await hideToggle.click();
    await page.waitForTimeout(300);

    // After toggling: figure name should be hidden
    const textAfter = await panel.textContent() ?? '';
    expect(textAfter).not.toMatch(/Rectangle|Carré/i);

    // But segment lengths should still be visible
    expect(textAfter).toMatch(/\d+,?\d*\s*(cm|mm)/);
  });
});
