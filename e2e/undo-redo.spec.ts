import { test } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { clickAction, waitForStatus } from './helpers/toolbar';
import {
  expectPointCount,
  expectSegmentCount,
  expectUndoEnabled,
  expectRedoEnabled,
} from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Undo / Redo', () => {
  test('undoes and redoes 3 segment creations', async ({ page }) => {
    // Create 3 segments forming a triangle
    await clickCanvas(page, 50, 50);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 100, 50);
    await waitForStatus(page, /Continue/);
    await clickCanvas(page, 75, 93);
    await waitForStatus(page, /Continue/);
    await clickCanvas(page, 50, 50);

    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Undo 3 times — each undo removes one CREATE_SEGMENT action
    await clickAction(page, 'undo');
    await clickAction(page, 'undo');
    await clickAction(page, 'undo');

    await expectSegmentCount(page, 0);
    await expectPointCount(page, 0);
    await expectUndoEnabled(page, false);
    await expectRedoEnabled(page, true);

    // Redo 3 times
    await clickAction(page, 'redo');
    await clickAction(page, 'redo');
    await clickAction(page, 'redo');

    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);
    await expectRedoEnabled(page, false);
  });
});
