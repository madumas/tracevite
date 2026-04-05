import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus, clickAction } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

/** Open HelpDialog then click "Commencer le tutoriel". */
async function startTutorial(page: import('@playwright/test').Page) {
  await page.locator('[data-testid="help-tutorial"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="help-start-tutorial"]').click();
  await page.waitForTimeout(300);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Tutorial', () => {
  test('forces segment tool on start', async ({ page }) => {
    await selectTool(page, 'move');
    await waitForStatus(page, /Déplacer/);

    await startTutorial(page);
    await waitForStatus(page, /Tutoriel/);
  });

  test('messages appear in status bar', async ({ page }) => {
    await startTutorial(page);

    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toContainText('Tutoriel');
    await expect(statusBar).toContainText('tracer un segment');
    await expect(page.locator('[data-testid="tutorial-skip"]')).toBeVisible();
  });

  test('full 4-step flow: segment → undo → select+delete → finish', async ({
    page,
  }, testInfo) => {
    await startTutorial(page);
    const statusBar = page.locator('[data-testid="status-bar"]');

    // Step 1: create a segment
    await expect(statusBar).toContainText('tracer un segment');
    await interactCanvas(page, testInfo, 50, 50);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Step 2: undo
    await expect(statusBar).toContainText('Annuler', { timeout: 3000 });
    await clickAction(page, 'undo');
    await page.waitForTimeout(300);

    // Step 3a: retrace a segment
    await expect(statusBar).toContainText('Retrace', { timeout: 3000 });
    await interactCanvas(page, testInfo, 50, 80);
    await interactCanvas(page, testInfo, 100, 80);
    await expectSegmentCount(page, 1);

    // Step 3b: select and delete
    await expect(statusBar).toContainText('Sélectionner', { timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await selectTool(page, 'select');
    await page.waitForTimeout(200);
    await interactCanvas(page, testInfo, 75, 80);
    await page.waitForTimeout(500);
    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click();
    await page.waitForTimeout(300);
    await deleteBtn.click();
    await page.waitForTimeout(300);

    // Step 4: finish
    await expect(statusBar).toContainText('corriger', { timeout: 3000 });
    await expect(page.locator('[data-testid="tutorial-finish"]')).toBeVisible();
  });

  test('skip returns to normal status', async ({ page }) => {
    await startTutorial(page);
    await expect(page.locator('[data-testid="status-bar"]')).toContainText('Tutoriel');

    await page.locator('[data-testid="tutorial-skip"]').click();
    await page.waitForTimeout(300);

    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).not.toContainText('Tutoriel', { timeout: 3000 });
  });
});
