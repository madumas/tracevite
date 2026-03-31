import { test } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');

  // Point tool is hidden by default — enable via settings
  await page.locator('[data-testid="settings-button"]').click();
  await page.locator('[data-testid="settings-dialog"]').waitFor();
  const pointRow = page.getByText('Outil Point (visible)').locator('..');
  await pointRow.locator('input[type="checkbox"]').check();
  await page.locator('[data-testid="settings-dialog"]').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(200);
});

test.describe('Point tool', () => {
  test('places free points on canvas', async ({ page }, testInfo) => {
    // Point tool should now be visible
    await selectTool(page, 'point');
    await waitForStatus(page, /Point.*placer/);

    // Place 3 free points
    await interactCanvas(page, testInfo, 50, 50);
    await interactCanvas(page, testInfo, 100, 80);
    await interactCanvas(page, testInfo, 75, 120);

    await expectPointCount(page, 3);
    // No segments created — these are free points
    await expectSegmentCount(page, 0);
  });
});
