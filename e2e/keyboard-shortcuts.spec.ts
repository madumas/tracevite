import { test, expect } from '@playwright/test';
import { waitForStatus, openClassSettings } from './helpers/toolbar';

// Keyboard shortcuts are desktop-only (not relevant for touch)
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop Chrome', 'Keyboard shortcuts are desktop-only');
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Keyboard shortcuts', () => {
  test('switches tools via letter keys when enabled', async ({ page }) => {
    // Enable keyboard shortcuts via settings
    const dialog = await openClassSettings(page);

    const shortcutRow = page.getByText('Raccourcis clavier').locator('..');
    await shortcutRow.locator('input[type="checkbox"]').check();

    // Close settings
    await dialog.locator('button[aria-label="Fermer"]').click();
    await page.waitForTimeout(200);

    // Press 'v' → Move tool
    await page.keyboard.press('v');
    await waitForStatus(page, /ramasser/);

    // Press 's' → Segment tool
    await page.keyboard.press('s');
    await waitForStatus(page, /premier point/);

    // Verify toast notification appeared
    const toast = page.locator('[data-testid="tool-toast"]');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('Ctrl+Z undoes and Ctrl+Y redoes (always available)', async ({ page }) => {
    // These work without enabling shortcuts
    const { clickCanvas } = await import('./helpers/canvas');

    // Create a segment
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 100, 50);

    // Undo via keyboard
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);

    // Check undo button is disabled (nothing left to undo)
    const undoBtn = page.locator('[data-testid="action-undo"]');
    await expect(undoBtn).toBeDisabled({ timeout: 3000 });

    // Redo via keyboard
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(200);

    // Redo button should now be disabled (nothing left to redo)
    const redoBtn = page.locator('[data-testid="action-redo"]');
    await expect(redoBtn).toBeDisabled({ timeout: 3000 });
  });
});
