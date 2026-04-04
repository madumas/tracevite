import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';

test.describe('Fatigue reminder', () => {
  test('shows reminder after configured time elapses', async ({ page }, testInfo) => {
    // Install fake timers before navigation so setTimeout is intercepted from the start
    await page.clock.install();
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Open settings and enable fatigue reminder (20 minutes)
    await page.locator('[data-testid="settings-button"]').click();
    await page.waitForTimeout(300);
    const fatigueSelect = page
      .locator('text=Rappel de pause')
      .locator('..')
      .locator('select');
    await expect(fatigueSelect).toBeVisible({ timeout: 3000 });
    await fatigueSelect.selectOption('20');
    await page.waitForTimeout(200);

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Reminder should NOT be visible yet
    const reminder = page.getByText('Tu travailles depuis un moment');
    await expect(reminder).not.toBeVisible({ timeout: 1000 });

    // Build a segment to show some activity
    await interactCanvas(page, testInfo, 50, 50);
    await interactCanvas(page, testInfo, 100, 50);
    await page.keyboard.press('Escape');

    // Fast-forward 21 minutes to trigger the setTimeout
    await page.clock.fastForward(21 * 60 * 1000);

    // The fatigue reminder should now be visible
    await expect(reminder).toBeVisible({ timeout: 5000 });

    // Dismiss the reminder
    const okButton = page.getByRole('button', { name: 'OK' }).last();
    await okButton.click();
    await expect(reminder).not.toBeVisible({ timeout: 3000 });
  });
});
