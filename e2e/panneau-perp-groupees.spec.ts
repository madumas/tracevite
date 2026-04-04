import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Switch to Complet mode for full property detection
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
});

test.describe('Perpendicular properties grouped in panel', () => {
  test('rectangle perpendiculars are grouped (fewer ⊥ entries than ungrouped pairs)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel test');

    // Build a rectangle: (50,50) → (100,50) → (100,80) → (50,80) → close to (50,50)
    await interactCanvas(page, testInfo, 50, 50);
    await interactCanvas(page, testInfo, 100, 50);
    await interactCanvas(page, testInfo, 100, 80);
    await interactCanvas(page, testInfo, 50, 80);
    await interactCanvas(page, testInfo, 50, 50); // close
    await page.keyboard.press('Escape');
    await expectSegmentCount(page, 4);

    // Open panel
    await page.locator('[data-testid="panel-toggle"]').click();
    await page.waitForTimeout(300);

    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the Propriétés accordion to see perpendiculars
    const propsAccordion = panel.locator('[data-testid="accordion-Propriétés"]');
    if (await propsAccordion.isVisible({ timeout: 1000 }).catch(() => false)) {
      await propsAccordion.click();
      await page.waitForTimeout(200);
    }

    // Read the full panel text content
    const panelText = await panel.textContent();
    expect(panelText).toBeTruthy();

    // Count occurrences of the ⊥ symbol in the panel
    const perpCount = (panelText!.match(/⊥/g) || []).length;

    // A rectangle has 4 right angles, producing 4 raw perpendicular pairs.
    // Grouped, each segment appears once as source with its perpendicular targets,
    // so we expect at most 4 ⊥ symbols (grouped), not 8+ (ungrouped individual pairs).
    expect(perpCount).toBeGreaterThanOrEqual(1); // at least some perpendiculars detected
    expect(perpCount).toBeLessThanOrEqual(4); // grouped, not one per pair

    // Verify the panel contains the ⊥ symbol visibly
    const perpEntries = panel.locator('text=⊥');
    const count = await perpEntries.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(4);
  });
});
