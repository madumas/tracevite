import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
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

    // Auto-intersection should create an intersection point at ~(90, 80)
    // This splits the first segment into 2, so:
    // Points: 2 (horizontal endpoints) + 2 (vertical endpoints) + 1 (intersection) = 5
    // Segments: 2 (horizontal split) + 1 (vertical) = 3
    // OR if vertical is also split: 2 + 2 = 4 segments, 5 points
    const pointCount = await page
      .locator('[data-testid="point-layer"] [data-testid^="point-"]')
      .count();
    const segCount = await page
      .locator('[data-testid="segment-layer"] [data-testid^="segment-"]')
      .count();

    // At minimum: more than 4 points (intersection point was created)
    expect(pointCount).toBeGreaterThanOrEqual(5);
    // At minimum: more than 2 segments (split occurred)
    expect(segCount).toBeGreaterThanOrEqual(3);
  });

  test('no intersection when auto-intersection is disabled', async ({ page }, testInfo) => {
    // Disable auto-intersection via settings
    await page.locator('[data-testid="settings-button"]').click();
    await page.locator('[data-testid="settings-dialog"]').waitFor();
    const row = page.getByText('Intersections automatiques').locator('..');
    await row.locator('input[type="checkbox"]').uncheck();
    await page.locator('[data-testid="settings-dialog"]').click({ position: { x: 5, y: 5 } });
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
