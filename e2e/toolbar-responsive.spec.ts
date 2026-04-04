import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Toolbar responsive overflow at 1024px', () => {
  test('shows more-tools button and hides overflow tools in Complet mode', async ({ page }) => {
    // Set a narrow viewport (1024 < 1200px threshold)
    await page.setViewportSize({ width: 1024, height: 768 });

    // Switch to Complet mode
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await page.waitForTimeout(300);

    // The "more-tools" button (⋯) should be visible at this width
    await expect(page.locator('[data-testid="more-tools"]')).toBeVisible({ timeout: 3000 });

    // Overflow tools should NOT be visible when collapsed
    await expect(page.locator('[data-testid="tool-reproduce"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="tool-compare"]')).not.toBeVisible();
  });
});
