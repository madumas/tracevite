import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus, openClassSettings } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Auto-intersection', () => {
  test('creates intersection point when segments cross (enabled by default)', async ({
    page,
  }, testInfo) => {
    // Create a horizontal segment
    await interactCanvas(page, testInfo, 40, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 140, 80);
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);

    // Exit chaining
    await page.keyboard.press('Escape');

    // Create a vertical segment that crosses the horizontal one
    await interactCanvas(page, testInfo, 90, 40);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 120);

    // Auto-intersection creates ONE shared junction point at ~(90, 80)
    // 2 (horizontal endpoints) + 2 (vertical endpoints) + 1 (shared intersection) = 5 points
    // 2 (horizontal split) + 2 (vertical split) = 4 segments
    await expectPointCount(page, 5);
    await expectSegmentCount(page, 4);
  });

  test('no intersection when auto-intersection is disabled', async ({ page }, testInfo) => {
    // Disable auto-intersection via settings
    const dialog = await openClassSettings(page);
    const row = page.getByText('Intersections automatiques').locator('..');
    await row.locator('input[type="checkbox"]').uncheck();
    await dialog.locator('button[aria-label="Fermer"]').click();
    await page.waitForTimeout(200);

    // Create crossing segments
    await interactCanvas(page, testInfo, 40, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 140, 80);
    await page.keyboard.press('Escape');

    await interactCanvas(page, testInfo, 90, 40);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 90, 120);

    // No intersection point — just 4 points and 2 segments
    await expectPointCount(page, 4);
    await expectSegmentCount(page, 2);
  });
});
