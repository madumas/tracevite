import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Length input (fix segment length)', () => {
  test('fixes segment length via context action bar', async ({ page }, testInfo) => {
    // Create a segment
    await interactCanvas(page, testInfo, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 80);
    await expectSegmentCount(page, 1);

    // Exit chaining
    await page.keyboard.press('Escape');
    await waitForStatus(page, /premier point/);

    // Click on segment body (midpoint) to select it — trySelect intercepts for segments
    await interactCanvas(page, testInfo, 75, 80);

    // Context action bar should appear with fix-length button
    const fixBtn = page.locator('[data-testid="context-fix-length"]');
    await fixBtn.waitFor({ timeout: 3000 });
    await fixBtn.click();

    // LengthInput should appear
    const input = page.locator('[data-testid="length-input-field"]');
    await input.waitFor({ timeout: 3000 });

    // Type a length (French decimal: 5 cm)
    await input.fill('5');
    await input.press('Enter');

    // LengthInput should close
    await expect(page.locator('[data-testid="length-input"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('shows current length and accepts input', async ({ page }, testInfo) => {
    // Create and select a segment
    await interactCanvas(page, testInfo, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 80);
    await page.keyboard.press('Escape');
    await waitForStatus(page, /premier point/);
    await interactCanvas(page, testInfo, 75, 80);

    const fixBtn = page.locator('[data-testid="context-fix-length"]');
    await fixBtn.waitFor({ timeout: 3000 });
    await fixBtn.click();

    const input = page.locator('[data-testid="length-input-field"]');
    await input.waitFor({ timeout: 3000 });

    // Input should be focused and show placeholder
    await expect(input).toBeVisible();

    // Type value and submit
    await input.fill('7');
    await input.press('Enter');

    // Input should close after submit
    await expect(page.locator('[data-testid="length-input"]')).not.toBeVisible({ timeout: 3000 });
  });
});
