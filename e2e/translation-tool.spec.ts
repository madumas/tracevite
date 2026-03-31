import { test } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Translation tool is complet mode only
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
});

test.describe('Translation tool', () => {
  test('translates a segment by a defined vector', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    await page.keyboard.press('Escape');

    // Select translation tool
    await selectTool(page, 'translation');
    await waitForStatus(page, /flèche|vecteur|début/);

    // Define translation vector: 2 clicks (start and end of arrow)
    await interactCanvas(page, testInfo, 30, 30);
    await waitForStatus(page, /fin|arrivée/);
    await interactCanvas(page, testInfo, 30, 80);

    // Now select the segment to translate
    await waitForStatus(page, /segment|figure/);
    await interactCanvas(page, testInfo, 75, 50);

    // Should have: original segment + translated copy
    await expectSegmentCount(page, 2);
  });
});
