import { test, expect } from '@playwright/test';
import { clickCanvas, tapCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectPointCount, expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Select tool', () => {
  test('is visible in toolbar in both modes', async ({ page }) => {
    // Visible in Simplifié (default)
    await expect(page.locator('[data-testid="tool-select"]')).toBeVisible();

    // Switch to Complet mode
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('text=Complet').click();
    await expect(page.locator('[data-testid="tool-select"]')).toBeVisible();
  });

  test('selects segment and shows properties panel', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create a segment
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await click(page, 150, 80);
    await expectSegmentCount(page, 1);

    // Switch to Select tool
    await selectTool(page, 'select');
    await waitForStatus(page, /Sélectionner/);

    // Click on segment midpoint
    await click(page, 100, 80);

    // ContextActionBar should appear
    await expect(page.locator('[data-testid="context-action-bar"]')).toBeVisible({ timeout: 3000 });
  });

  test('deselects on click on empty space', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create a segment
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await click(page, 150, 80);

    // Select it
    await selectTool(page, 'select');
    await click(page, 100, 80);
    await expect(page.locator('[data-testid="context-action-bar"]')).toBeVisible({ timeout: 3000 });

    // Click on empty space
    await click(page, 250, 250);

    // ContextActionBar should disappear
    await expect(page.locator('[data-testid="context-action-bar"]')).not.toBeVisible();
  });

  test('context action bar has Supprimer button', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create a segment
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await click(page, 150, 80);

    // Select it
    await selectTool(page, 'select');
    await click(page, 100, 80);

    // Supprimer button visible
    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await expect(deleteBtn).toHaveText('Supprimer');
  });

  test('cross-cutting selection still works in move tool idle', async ({ page }, testInfo) => {
    const isTouchProject = testInfo.project.name !== 'Desktop Chrome';
    const click = isTouchProject ? tapCanvas : clickCanvas;

    // Create a segment
    await click(page, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await click(page, 150, 80);

    // Switch to Move tool (not select)
    await selectTool(page, 'move');

    // Click on segment midpoint — should select via cross-cutting
    await click(page, 100, 80);

    // ContextActionBar should appear
    await expect(page.locator('[data-testid="context-action-bar"]')).toBeVisible({ timeout: 3000 });
  });
});
