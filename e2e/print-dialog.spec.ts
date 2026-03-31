import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { clickAction, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Print Dialog', () => {
  test('opens dialog and shows orientation and format controls', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    // Open print dialog
    await clickAction(page, 'print');
    const dialog = page.locator('[data-testid="print-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Should have orientation options (Portrait/Paysage)
    await expect(dialog.getByText('Portrait')).toBeVisible();
    await expect(dialog.getByText('Paysage')).toBeVisible();

    // Should have PDF download button
    await expect(page.locator('[data-testid="print-download-pdf"]')).toBeVisible();
  });

  test('downloads PDF after switching to landscape', async ({ page }, testInfo) => {
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);

    await clickAction(page, 'print');
    await page.locator('[data-testid="print-dialog"]').waitFor();

    // Switch to landscape
    await page.getByText('Paysage').click();

    // Download PDF
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="print-download-pdf"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
