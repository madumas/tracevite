import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Properties panel', () => {
  test('shows "Segments" for isolated segments, "Côtés" when in a figure', async ({
    page,
  }, testInfo) => {
    // Skip on narrow viewports where panel is a modal (harder to toggle reliably)
    test.skip(testInfo.project.name === 'Mobile iPad', 'Panel is modal overlay on iPad');

    // Create a single segment (not part of a figure)
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Open properties panel (desktop/chromebook: sidebar toggle)
    await page.locator('[data-testid="panel-toggle"]').click();

    // Should say "Segments" (isolated segment, not part of a figure)
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });
    await expect(panel.getByText('Segments')).toBeVisible();

    // Now close the triangle
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 75, 93);
    await interactCanvas(page, testInfo, 50, 50);
    await expectSegmentCount(page, 3);

    // Panel should now say "Côtés" (PFEQ vocabulary for sides of a figure)
    await expect(panel.getByText('Côtés')).toBeVisible({ timeout: 3000 });
  });

});
