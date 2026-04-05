import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { openClassSettings } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Reinforced grid toggle', () => {
  test('toggle exists in settings and can be activated', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click();
    await page.waitForTimeout(300);

    const toggle = page.locator('text=Grille renforcée').locator('..').locator('input[type="checkbox"]');
    await expect(toggle).toBeVisible({ timeout: 3000 });
    await expect(toggle).not.toBeChecked();

    await toggle.click({ force: true });
    await expect(toggle).toBeChecked();

    await page.keyboard.press('Escape'); // close settings
  });
});

test.describe('Focus mode', () => {
  test('toggle exists in settings', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click();
    await page.waitForTimeout(300);

    const toggle = page.locator('text=Mode focus').locator('..').locator('input[type="checkbox"]');
    await expect(toggle).toBeVisible({ timeout: 3000 });
    await expect(toggle).not.toBeChecked();
  });

  test('dimming activates when focus mode on + segment selected', async ({ page }, testInfo) => {
    // Create two disconnected segments
    await interactCanvas(page, testInfo, 30, 50);
    await interactCanvas(page, testInfo, 70, 50);
    await page.keyboard.press('Escape');

    await interactCanvas(page, testInfo, 30, 100);
    await interactCanvas(page, testInfo, 70, 100);
    await page.keyboard.press('Escape');
    await expectSegmentCount(page, 2);

    // Enable focus mode
    await page.locator('[data-testid="settings-button"]').click();
    await page.waitForTimeout(300);
    const toggle = page.locator('text=Mode focus').locator('..').locator('input[type="checkbox"]');
    await toggle.click({ force: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Select first segment by clicking on its body (middle, away from endpoints)
    // Segment tool is default — switch to segment then back to get selection mode
    await page.locator('[data-testid="tool-segment"]').click();
    // In idle+move mode, clicking a segment body selects it
    await page.locator('[data-testid="tool-move"]').click();
    await interactCanvas(page, testInfo, 50, 50); // middle of segment 1 (30,50)→(70,50)
    await page.waitForTimeout(500);

    // Verify dimming via DOM inspection
    const dimmedCount = await page.evaluate(() => {
      const layer = document.querySelector('[data-testid="segment-layer"]');
      if (!layer) return 0;
      let count = 0;
      for (const g of layer.querySelectorAll(':scope > g')) {
        const op = g.getAttribute('opacity');
        if (op && parseFloat(op) < 0.5) count++;
      }
      return count;
    });
    // At least one segment should be dimmed (the non-adjacent one)
    expect(dimmedCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Animate transformations toggle', () => {
  test('toggle exists in settings, default off', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click();
    await page.waitForTimeout(300);

    const toggle = page.locator('text=Animer les transformations').locator('..').locator('input[type="checkbox"]');
    await expect(toggle).toBeVisible({ timeout: 3000 });
    await expect(toggle).not.toBeChecked();
  });
});

test.describe('Clutter threshold presets', () => {
  test('settings shows clutter threshold selector with named presets', async ({ page }) => {
    await openClassSettings(page);

    // Verify the clutter threshold selector with preset options
    const html = await page.content();
    expect(html).toContain('Seuil de surcharge');
    expect(html).toContain('3 segments');
    expect(html).toContain('Toujours afficher');

    await page.keyboard.press('Escape');
  });

  test('animate transformations toggle default off and can be activated', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click();
    await page.waitForTimeout(300);

    const toggle = page
      .locator('text=Animer les transformations')
      .locator('..')
      .locator('input[type="checkbox"]');
    await expect(toggle).toBeVisible({ timeout: 3000 });
    await expect(toggle).not.toBeChecked();

    // Activate
    await toggle.click({ force: true });
    await expect(toggle).toBeChecked();

    // Deactivate
    await toggle.click({ force: true });
    await expect(toggle).not.toBeChecked();

    await page.keyboard.press('Escape');
  });
});
