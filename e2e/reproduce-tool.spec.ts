import { test } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Reproduce tool is behind "Plus d'outils" in simplifie — switch to complet
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
});

test.describe('Reproduce tool', () => {
  test('duplicates a segment at a new position', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);

    await page.keyboard.press('Escape');

    // Select reproduce tool
    await selectTool(page, 'reproduce');
    await waitForStatus(page, /sélectionner|reproduire/);

    // Click on the segment to select it for reproduction
    await interactCanvas(page, testInfo, 75, 50);
    await waitForStatus(page, /placer la copie/);

    // Click at a new position to place the copy
    await interactCanvas(page, testInfo, 75, 120);

    // Should have: 4 points (2 original + 2 copy), 2 segments
    await expectSegmentCount(page, 2);
    await expectPointCount(page, 4);
  });
});
