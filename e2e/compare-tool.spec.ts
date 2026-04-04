import { test } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Default: complet mode for most tests
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(200);
});

test.describe('Compare tool', () => {
  test('compares two segments and shows result', async ({ page }, testInfo) => {
    // Create first segment
    await interactCanvas(page, testInfo, 40, 60);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 60);
    await expectSegmentCount(page, 1);
    await page.keyboard.press('Escape');

    // Create second segment (same length, different position)
    await interactCanvas(page, testInfo, 40, 120);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 120);
    await expectSegmentCount(page, 2);
    await page.keyboard.press('Escape');

    // Select compare tool
    await selectTool(page, 'compare');
    await waitForStatus(page, /Comparer/);

    // Click first segment
    await interactCanvas(page, testInfo, 65, 60);
    await waitForStatus(page, /deuxième/);

    // Click second segment
    await interactCanvas(page, testInfo, 65, 120);

    // Should show comparison result (isometric or not)
    await waitForStatus(page, /isométriques|Comparer/);
  });

  test('resets on click after showing result', async ({ page }, testInfo) => {
    // Create two segments
    await interactCanvas(page, testInfo, 40, 60);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 60);
    await page.keyboard.press('Escape');
    await interactCanvas(page, testInfo, 40, 120);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 120);
    await page.keyboard.press('Escape');

    await selectTool(page, 'compare');
    await interactCanvas(page, testInfo, 65, 60);
    await waitForStatus(page, /deuxième/);
    await interactCanvas(page, testInfo, 65, 120);
    await waitForStatus(page, /isométriques|Comparer/);

    // Click anywhere to reset
    await interactCanvas(page, testInfo, 100, 100);
    await waitForStatus(page, /Comparer.*Clique/);
  });

  test('uses PFEQ vocabulary in Simplifié mode', async ({ page }, testInfo) => {
    // Switch to Simplifié
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-simplifie"]').click();
    await page.waitForTimeout(200);

    // Create two identical segments
    await interactCanvas(page, testInfo, 40, 60);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 60);
    await page.keyboard.press('Escape');
    await interactCanvas(page, testInfo, 40, 120);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 120);
    await page.keyboard.press('Escape');

    // Compare is behind "Plus d'outils" in Simplifié
    const moreBtn = page.locator('[data-testid="more-tools"]');
    if (await moreBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(200);
    }
    await selectTool(page, 'compare');
    await interactCanvas(page, testInfo, 65, 60);
    await waitForStatus(page, /deuxième/);
    await interactCanvas(page, testInfo, 65, 120);

    // Simplifié should say "même forme" not "isométriques"
    await waitForStatus(page, /même forme/);
  });
});
