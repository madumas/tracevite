import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Exclusion des angles réflexes (>180°)', () => {
  test('aucun angle réflexe affiché pour un quadrilatère concave', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel test');

    // Switch to Complet mode for full angle display with degrees
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();

    // Build a concave quadrilateral (dart/chevron shape)
    // Points: A(40,40), B(100,60), C(40,85), D(65,60) — D is the concave vertex
    await interactCanvas(page, testInfo, 40, 40);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 60);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 40, 85);
    await interactCanvas(page, testInfo, 65, 60);
    await interactCanvas(page, testInfo, 40, 40); // close quadrilateral
    await expectSegmentCount(page, 4);
    await expectPointCount(page, 4);

    // Press Escape to deselect / cancel any chaining
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Expand the "Angles" accordion
    await panel.locator('[data-testid="accordion-Angles"]').click();
    await page.waitForTimeout(200);

    const text = await panel.textContent() ?? '';

    // No angle value >= 200° should appear (reflex angles excluded)
    // Regex matches 200°–399° which would be reflex angles
    expect(text).not.toMatch(/[2-3]\d{2}°/);

    // Only valid angle classifications should be present (aigu, droit, obtus, plat)
    // No "rentrant" or "réflexe" classification
    expect(text).not.toMatch(/rentrant/i);
    expect(text).not.toMatch(/réflexe/i);
  });
});
