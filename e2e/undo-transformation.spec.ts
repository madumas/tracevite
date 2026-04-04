import { test } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { selectTool, clickAction, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Undo transformation as single operation', () => {
  test('one undo after reflection removes entire reflected figure', async ({ page }, testInfo) => {
    // Build a triangle: 3 segments
    await interactCanvas(page, testInfo, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 100, 50);
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 75, 90);
    await interactCanvas(page, testInfo, 50, 50); // close triangle
    await expectSegmentCount(page, 3);

    await page.keyboard.press('Escape');

    // Use reflection tool
    await selectTool(page, 'reflection');
    await waitForStatus(page, /axe de réflexion/);

    // Define a vertical axis to the right of the triangle
    await interactCanvas(page, testInfo, 140, 30);
    await interactCanvas(page, testInfo, 140, 120);

    // Wait for element selection phase
    await waitForStatus(page, /figure.*refléter|Clique sur/);

    // Click on the triangle (click on one of its segments)
    await interactCanvas(page, testInfo, 75, 50);
    await page.waitForTimeout(1000);

    // After reflection: original 3 + reflected 3 = 6 segments
    await expectSegmentCount(page, 6);

    // One undo should revert the entire reflection at once
    await clickAction(page, 'undo');

    // Back to 3 segments — whole transformation undone, not segment-by-segment
    await expectSegmentCount(page, 3);
  });
});
