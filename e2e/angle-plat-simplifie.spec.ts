import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Angle plat in Simplifié mode', () => {
  test('displays "(points alignés)" not "(plat)" for 180° angle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel test');

    // Default mode is Simplifié — build 3 collinear points forming a 180° angle
    await interactCanvas(page, testInfo, 30, 60);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 80, 60);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 130, 60);

    await expectSegmentCount(page, 2);

    // Escape chaining, open panel, expand Angles
    await page.keyboard.press('Escape');
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    await panel.locator('[data-testid="accordion-Angles"]').click();
    await page.waitForTimeout(200);

    const text = (await panel.textContent()) ?? '';
    expect(text).toContain('(points alignés)');
    expect(text).not.toContain('(plat)');
  });
});
