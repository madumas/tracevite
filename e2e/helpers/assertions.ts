import { type Page, expect } from '@playwright/test';

/**
 * Assert count of rendered points (by data-testid="point-{id}").
 * Each point has a unique data-testid, avoiding false counts from SVG sub-elements.
 */
export async function expectPointCount(page: Page, count: number): Promise<void> {
  const points = page.locator('[data-testid="point-layer"] [data-testid^="point-"]');
  await expect(points).toHaveCount(count, { timeout: 3000 });
}

/**
 * Assert count of rendered segments (by data-testid="segment-{id}").
 * Each segment renders multiple <line> elements (hit zone, highlight, visible),
 * but only the <g> wrapper has data-testid="segment-{id}".
 */
export async function expectSegmentCount(page: Page, count: number): Promise<void> {
  const segments = page.locator('[data-testid="segment-layer"] [data-testid^="segment-"]');
  await expect(segments).toHaveCount(count, { timeout: 3000 });
}

export async function expectUndoEnabled(page: Page, enabled: boolean): Promise<void> {
  const btn = page.locator('[data-testid="action-undo"]');
  if (enabled) {
    await expect(btn).toBeEnabled({ timeout: 3000 });
  } else {
    await expect(btn).toBeDisabled({ timeout: 3000 });
  }
}

export async function expectRedoEnabled(page: Page, enabled: boolean): Promise<void> {
  const btn = page.locator('[data-testid="action-redo"]');
  if (enabled) {
    await expect(btn).toBeEnabled({ timeout: 3000 });
  } else {
    await expect(btn).toBeDisabled({ timeout: 3000 });
  }
}
