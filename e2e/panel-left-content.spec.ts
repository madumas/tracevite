import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Panel on left side with content', () => {
  test('left panel shows figure properties after building a triangle', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel test');

    // Build a triangle: (50,50) → (100,50) → (75,90) → close to (50,50)
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await interactCanvas(page, testInfo, 75, 90);
    await interactCanvas(page, testInfo, 50, 50); // close
    await page.keyboard.press('Escape');
    await expectSegmentCount(page, 3);

    // Open settings and switch panel to left
    await page.locator('[data-testid="settings-button"]').click();
    await page.waitForTimeout(300);
    const panelSelect = page.locator('text=Panneau latéral').locator('..').locator('select');
    await expect(panelSelect).toBeVisible({ timeout: 3000 });
    await panelSelect.selectOption('left');
    await page.waitForTimeout(200);

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Open panel
    await page.locator('[data-testid="panel-toggle"]').click();
    await page.waitForTimeout(300);

    // Verify panel is visible with content
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Panel should contain figure/side vocabulary (triangle detected)
    const hasCote = await panel.locator('text=Côté').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasTriangle = await panel.locator('text=Triangle').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasCote || hasTriangle).toBeTruthy();

    // Verify panel is on the left: panel bounding box x should be less than canvas x
    const panelBox = await panel.boundingBox();
    const canvasBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
    expect(panelBox).toBeTruthy();
    expect(canvasBox).toBeTruthy();
    expect(panelBox!.x).toBeLessThan(canvasBox!.x);
  });
});
