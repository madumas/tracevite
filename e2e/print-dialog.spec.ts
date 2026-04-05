import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

/** Open print dialog via Share menu → Imprimer */
async function openPrintDialog(page: import('@playwright/test').Page) {
  await page.locator('[data-testid="action-share"]').click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Imprimer")').click();
  await page.locator('[data-testid="print-dialog"]').waitFor({ timeout: 5000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Print Dialog', () => {
  test('opens dialog and shows orientation and format controls', async ({ page }, testInfo) => {
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await expectSegmentCount(page, 1);

    await openPrintDialog(page);
    const dialog = page.locator('[data-testid="print-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByText('Portrait')).toBeVisible();
    await expect(dialog.getByText('Paysage')).toBeVisible();
    await expect(page.locator('[data-testid="print-download-pdf"]')).toBeVisible();
  });

  test('downloads PDF after switching to landscape', async ({ page }, testInfo) => {
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);

    await openPrintDialog(page);

    await page.getByText('Paysage').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="print-download-pdf"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
