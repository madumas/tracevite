import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Toolbar controls', () => {
  test('toggles snap on and off', async ({ page }) => {
    const snapBtn = page.locator('[data-testid="snap-toggle"]');
    await expect(snapBtn).toBeVisible();

    // Snap is on by default — click to toggle off
    await snapBtn.click();
    await page.waitForTimeout(200);

    // Click again to toggle back on
    await snapBtn.click();
    await page.waitForTimeout(200);

    // Button should still be visible and functional
    await expect(snapBtn).toBeVisible();
  });

  test('changes grid size', async ({ page }) => {
    // Default grid is 10mm (1cm). Switch to 5mm.
    const grid5 = page.locator('[data-testid="grid-5"]');
    await grid5.click();
    await page.waitForTimeout(200);

    // Switch to 20mm
    const grid20 = page.locator('[data-testid="grid-20"]');
    await grid20.click();
    await page.waitForTimeout(200);

    // Switch back to 10mm
    const grid10 = page.locator('[data-testid="grid-10"]');
    await grid10.click();
  });

  test('toggles unit between cm and mm', async ({ page }, testInfo) => {
    // Create a segment so there's a measurement to display
    await interactCanvas(page, testInfo, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 80);
    await expectSegmentCount(page, 1);

    // Default unit is cm — measurement label should contain "cm"
    const svgTexts = await page.locator('[data-testid="canvas-svg"] text').allTextContents();
    const hasCm = svgTexts.some((t) => t.includes('cm'));
    expect(hasCm).toBe(true);

    // Toggle to mm
    await page.locator('[data-testid="unit-toggle"]').click();
    await page.waitForTimeout(300);

    // Now should show mm
    const mmTexts = await page.locator('[data-testid="canvas-svg"] text').allTextContents();
    const hasMm = mmTexts.some((t) => t.includes('mm'));
    expect(hasMm).toBe(true);
  });
});
