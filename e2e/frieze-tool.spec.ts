import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Frieze is behind "Plus d'outils" — switch to complet for easier access
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
});

test.describe('Frieze tool', () => {
  test('creates a 1D frieze with 3 copies', async ({ page }, testInfo) => {
    // Create a segment to repeat
    await interactCanvas(page, testInfo, 40, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 80, 80);
    await expectSegmentCount(page, 1);
    await page.keyboard.press('Escape');

    // Select frieze tool
    await selectTool(page, 'frieze');
    await waitForStatus(page, /sélectionner|répéter/);

    // Click on the segment to select it
    await interactCanvas(page, testInfo, 60, 80);
    await waitForStatus(page, /flèche|début/);

    // Define translation vector (2 clicks)
    await interactCanvas(page, testInfo, 30, 50);
    await waitForStatus(page, /fin/);
    await interactCanvas(page, testInfo, 70, 50);

    // FriezePanel should appear with stepper
    const panel = page.locator('[data-testid="frieze-panel"]');
    await expect(panel).toBeVisible({ timeout: 3000 });

    // Default count is 3 — status should show "copie"
    await waitForStatus(page, /copie/);

    // Validate to create the frieze
    await page.locator('[data-testid="frieze-validate"]').click();

    // Original + 2 copies = 3 segments total (count=3 means original + 2 copies)
    const segCount = await page.locator('[data-testid="segment-layer"] [data-testid^="segment-"]').count();
    expect(segCount).toBeGreaterThanOrEqual(3);
  });

  test('increments and decrements copy count', async ({ page }, testInfo) => {
    // Create and select a segment
    await interactCanvas(page, testInfo, 40, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 80, 80);
    await page.keyboard.press('Escape');

    await selectTool(page, 'frieze');
    await interactCanvas(page, testInfo, 60, 80);
    await waitForStatus(page, /flèche|début/);

    // Define vector
    await interactCanvas(page, testInfo, 30, 50);
    await waitForStatus(page, /fin/);
    await interactCanvas(page, testInfo, 70, 50);

    // Panel visible
    await expect(page.locator('[data-testid="frieze-panel"]')).toBeVisible({ timeout: 3000 });

    // Increment count
    await page.locator('[data-testid="frieze-increment"]').click();
    await page.waitForTimeout(200);

    // Decrement back
    await page.locator('[data-testid="frieze-decrement"]').click();
    await page.waitForTimeout(200);

    // Validate
    await page.locator('[data-testid="frieze-validate"]').click();
    const segCount = await page.locator('[data-testid="segment-layer"] [data-testid^="segment-"]').count();
    expect(segCount).toBeGreaterThanOrEqual(3);
  });
});
