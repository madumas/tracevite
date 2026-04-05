import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Tutorial', () => {
  test('forces segment tool on start', async ({ page }) => {
    // Switch to move tool
    await selectTool(page, 'move');
    await waitForStatus(page, /Déplacer/);

    // Start tutorial via "?" button
    await page.locator('[data-testid="help-tutorial"]').click();
    await page.waitForTimeout(300);

    // Status bar should show tutorial message (segment tool is forced)
    await waitForStatus(page, /Tutoriel/);
  });

  test('messages appear in status bar', async ({ page }) => {
    await page.locator('[data-testid="help-tutorial"]').click();
    await page.waitForTimeout(300);

    // Status bar should have yellow background and "Tutoriel" badge
    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toContainText('Tutoriel');
    await expect(statusBar).toContainText('tracer un segment');

    // Skip button should be in the status bar
    await expect(page.locator('[data-testid="tutorial-skip"]')).toBeVisible();
  });

  test('advances on segment creation', async ({ page }, testInfo) => {
    await page.locator('[data-testid="help-tutorial"]').click();
    await page.waitForTimeout(300);

    // Step 1: create a segment
    await interactCanvas(page, testInfo, 50, 50);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Status should advance to step 2 (undo instruction)
    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toContainText('Annuler', { timeout: 3000 });
  });

  test('skip returns to normal status', async ({ page }) => {
    await page.locator('[data-testid="help-tutorial"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="status-bar"]')).toContainText('Tutoriel');

    // Click "Passer"
    await page.locator('[data-testid="tutorial-skip"]').click();
    await page.waitForTimeout(300);

    // Status bar should return to normal tool message
    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).not.toContainText('Tutoriel', { timeout: 3000 });
  });
});
