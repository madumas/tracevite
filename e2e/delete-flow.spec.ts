import { test, expect } from '@playwright/test';
import { clickCanvas, tapCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Delete via ContextActionBar micro-confirmation', () => {
  test('deletes a segment with micro-confirmation (select + two clicks)', async ({
    page,
  }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create a segment (2 points)
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await click(page, 150, 80);
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);

    // Switch to Select tool and click on segment midpoint to select it
    await selectTool(page, 'select');
    await click(page, 100, 80);

    // ContextActionBar should appear with Supprimer button
    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await expect(deleteBtn).toHaveText('Supprimer');

    // First click — shows confirmation with concrete label
    await deleteBtn.click();
    await expect(deleteBtn).toHaveText(/Effacer/);

    // Second click — confirms deletion
    await deleteBtn.click();

    // Segment is deleted, points remain (spec: deleting segment keeps endpoints)
    await expectSegmentCount(page, 0);
    await expectPointCount(page, 2);
  });

  test('confirmation resets when changing selection', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create two segments
    await click(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await click(page, 150, 50);
    await expectSegmentCount(page, 1);

    await click(page, 150, 50);
    await waitForStatus(page, /deuxième point/);
    await click(page, 150, 150);
    await expectSegmentCount(page, 2);

    // Select first segment
    await selectTool(page, 'select');
    await click(page, 100, 50);

    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });

    // Start confirmation
    await deleteBtn.click();
    await expect(deleteBtn).toHaveText(/Effacer/);

    // Click on second segment — should reset confirmation
    await click(page, 150, 100);

    // Delete button should show "Supprimer" again (not "Effacer...")
    const newDeleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(newDeleteBtn).toBeVisible({ timeout: 3000 });
    await expect(newDeleteBtn).toHaveText('Supprimer');

    // Both segments still exist
    await expectSegmentCount(page, 2);
  });
});
