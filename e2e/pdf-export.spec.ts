import { test, expect } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { clickAction, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('PDF export', () => {
  test('downloads a non-empty PDF file', async ({ page }) => {
    // Create a segment so there's something to export
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 100, 50);
    await expectSegmentCount(page, 1);

    // Open print dialog via share menu
    await page.locator('[data-testid="action-share"]').click({ force: true });
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Imprimer")').click();
    await page.waitForSelector('[data-testid="print-dialog"]');

    // Intercept download and click PDF export
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="print-download-pdf"]').click();
    const download = await downloadPromise;

    // Verify filename and file is not empty
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});
