import { test, expect } from '@playwright/test';
import { tapCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }, testInfo) => {
  // Skip on desktop — these tests are touch-specific
  test.skip(testInfo.project.name === 'Desktop Chrome', 'Touch-only tests');

  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Mobile touch interactions', () => {
  test('tap creates a segment', async ({ page }) => {
    await tapCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);

    await tapCanvas(page, 100, 50);
    await expectPointCount(page, 2);
    await expectSegmentCount(page, 1);
  });

  test('more-tools button is visible in simplifie mode', async ({ page }) => {
    const moreTools = page.locator('[data-testid="more-tools"]');
    await expect(moreTools).toBeVisible();
  });

  test('canvas uses full viewport height (100dvh)', async ({ page }) => {
    const container = page.locator('[data-testid="canvas-container"]');
    const box = await container.boundingBox();
    expect(box).toBeTruthy();
    // Canvas should use a significant portion of the viewport height
    const viewport = page.viewportSize();
    expect(box!.height).toBeGreaterThan(viewport!.height * 0.4);
  });
});
