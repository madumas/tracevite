import { test, expect } from '@playwright/test';
import { clickCanvas, tapCanvas, interactCanvas } from './helpers/canvas';
import { selectTool, clickAction, waitForStatus } from './helpers/toolbar';
import {
  expectPointCount,
  expectSegmentCount,
  expectUndoEnabled,
  expectRedoEnabled,
} from './helpers/assertions';

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

    // Create two segments via chaining (A→B→C)
    await interactCanvas(page, testInfo, 40, 60);
    await waitForStatus(page, /deuxième/);
    await interactCanvas(page, testInfo, 100, 60);
    await expectSegmentCount(page, 1);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 80, 100);
    await expectSegmentCount(page, 2);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Select first segment (horizontal AB)
    await selectTool(page, 'select');
    await interactCanvas(page, testInfo, 70, 60);

    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });

    // Start confirmation
    await deleteBtn.click();
    await expect(deleteBtn).toHaveText(/Effacer/);

    // Click on second segment — should reset confirmation
    await interactCanvas(page, testInfo, 90, 80);

    // Delete button should show "Supprimer" again (not "Effacer...")
    const newDeleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(newDeleteBtn).toBeVisible({ timeout: 3000 });
    await expect(newDeleteBtn).toHaveText('Supprimer');

    // Both segments still exist
    await expectSegmentCount(page, 2);
  });

  test('delete is undoable and redoable', async ({ page }, testInfo) => {
    const click = testInfo.project.name !== 'Desktop Chrome' ? tapCanvas : clickCanvas;

    // Create a segment
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await click(page, 150, 80);
    await expectSegmentCount(page, 1);

    // Select and delete
    await selectTool(page, 'select');
    await click(page, 100, 80);

    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click();
    await deleteBtn.click();
    await expectSegmentCount(page, 0);

    // Undo should restore the segment
    await expectUndoEnabled(page, true);
    await clickAction(page, 'undo');
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);

    // Redo should delete it again
    await expectRedoEnabled(page, true);
    await clickAction(page, 'redo');
    await expectSegmentCount(page, 0);
    await expectPointCount(page, 2);
  });

  test('deleting a point cascades to connected segments', async ({ page }, testInfo) => {
    const click = testInfo.project.name !== 'Desktop Chrome' ? tapCanvas : clickCanvas;

    // Create a triangle (3 segments, 3 points)
    await click(page, 50, 60);
    await waitForStatus(page, /deuxième/);
    await click(page, 150, 60);
    await expectSegmentCount(page, 1);

    // Second segment via chaining
    await waitForStatus(page, /Continue/);
    await click(page, 100, 130);
    await expectSegmentCount(page, 2);

    // Close the triangle by clicking back on first point
    await waitForStatus(page, /Continue/);
    await click(page, 50, 60);
    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Escape chaining, select tool, select point A
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await selectTool(page, 'select');
    await click(page, 50, 60);

    // Delete point A via micro-confirmation
    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click();
    await expect(deleteBtn).toHaveText(/Effacer/);
    await deleteBtn.click();

    // Point A deleted, its 2 connected segments gone, 1 segment remains (B→C)
    await expectPointCount(page, 2);
    await expectSegmentCount(page, 1);
  });

  test('deselecting clears context action bar', async ({ page }, testInfo) => {
    const click = testInfo.project.name !== 'Desktop Chrome' ? tapCanvas : clickCanvas;

    // Create a segment
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième/);
    await click(page, 150, 80);
    await expectSegmentCount(page, 1);

    // Select it
    await selectTool(page, 'select');
    await click(page, 100, 80);
    await expect(page.locator('[data-testid="context-action-bar"]')).toBeVisible({ timeout: 3000 });

    // Escape deselects (Escape = panic button, spec §14)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="context-action-bar"]')).not.toBeVisible({ timeout: 3000 });

    // Segment still exists
    await expectSegmentCount(page, 1);
  });

  test('Escape cancels confirmation without deleting', async ({ page }, testInfo) => {
    const click = testInfo.project.name !== 'Desktop Chrome' ? tapCanvas : clickCanvas;

    // Create a segment
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième/);
    await click(page, 150, 80);
    await expectSegmentCount(page, 1);

    // Select it and start delete confirmation
    await selectTool(page, 'select');
    await click(page, 100, 80);

    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click();
    await expect(deleteBtn).toHaveText(/Effacer/);

    // Press Escape — should deselect and dismiss, NOT delete
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Segment still exists
    await expectSegmentCount(page, 1);
    await expectPointCount(page, 2);
  });

  test('screenshot: context action bar with Supprimer button', async ({ page }, testInfo) => {
    // Only run on desktop for screenshots
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'screenshots on desktop only');

    const click = clickCanvas;

    // Create a triangle for a richer visual
    await click(page, 50, 60);
    await waitForStatus(page, /deuxième/);
    await click(page, 150, 60);
    await waitForStatus(page, /Continue/);
    await click(page, 100, 130);
    await waitForStatus(page, /Continue/);
    await click(page, 50, 60);
    await expectSegmentCount(page, 3);

    // Escape chaining
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Select a segment to show context action bar
    await selectTool(page, 'select');
    await click(page, 100, 60);
    await expect(page.locator('[data-testid="context-action-bar"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="context-delete"]')).toHaveText('Supprimer');

    // Screenshot: context bar with Supprimer visible
    await page.screenshot({
      path: `e2e/screenshots/${testInfo.project.name}/delete-context-bar-supprimer.png`,
    });

    // Click to show confirmation state
    await page.locator('[data-testid="context-delete"]').click();
    await expect(page.locator('[data-testid="context-delete"]')).toHaveText(/Effacer/);

    // Screenshot: confirmation state
    await page.screenshot({
      path: `e2e/screenshots/${testInfo.project.name}/delete-context-bar-confirm.png`,
    });
  });
});
