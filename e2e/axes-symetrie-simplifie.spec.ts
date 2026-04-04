import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Axes de symétrie hidden in Simplifié mode', () => {
  test('does not show symmetry axes in properties panel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel test');

    // Default mode is Simplifié — build a square
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 50);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 90, 90);
    await interactCanvas(page, testInfo, 50, 90);
    await interactCanvas(page, testInfo, 50, 50); // close square

    await expectSegmentCount(page, 4);
    await expectPointCount(page, 4);

    // Open panel and expand Propriétés
    await page.keyboard.press('Escape');
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    await panel.locator('[data-testid="accordion-Propriétés"]').click();
    await page.waitForTimeout(200);

    const text = (await panel.textContent()) ?? '';
    expect(text).not.toContain('Axe de symétrie');
    expect(text).not.toContain('symmetry');
  });
});
