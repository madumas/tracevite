import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('PFEQ vocabulary — context-sensitive terms', () => {
  test('isolated segment uses "Segments" and "Points"', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Create a single segment (not part of a figure)
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    const text = await panel.textContent();
    // Isolated segment: should use "Segments", not "Cotes"
    expect(text).toMatch(/Segments/);
    // Should use "Points", not "Sommets"
    expect(text).toMatch(/Points/);
  });

  test('closed triangle uses "Cotes" and "Sommets"', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Create a triangle: 3 clicks + close back to first point
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 75, 93);
    await interactCanvas(page, testInfo, 50, 50); // close triangle
    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Open properties panel
    await page.locator('[data-testid="panel-toggle"]').click();
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    const text = await panel.textContent();
    // Closed figure: should use "Cotes" (PFEQ vocabulary for sides)
    expect(text).toMatch(/Côtés/);
    // Closed figure: should use "Sommets" (PFEQ vocabulary for vertices)
    expect(text).toMatch(/Sommets/);
  });
});
