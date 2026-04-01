import { test, expect } from '@playwright/test';

/**
 * Canvas sizing tests — run on ALL viewports (Desktop Chrome, Chromebook Touch, Mobile iPad).
 * Verifies that the canvas SVG fills the container and the print guide / grid are visible.
 */

test('canvas SVG fills container width', async ({ page }) => {
  await page.goto('/');
  const container = page.locator('[data-testid="canvas-container"]');
  const svg = page.locator('[data-testid="canvas-svg"]');
  await expect(svg).toBeVisible();
  const containerBox = await container.boundingBox();
  const svgBox = await svg.boundingBox();
  expect(svgBox!.width).toBeGreaterThanOrEqual(containerBox!.width - 1);
});

test('canvas SVG fills container height', async ({ page }) => {
  await page.goto('/');
  const container = page.locator('[data-testid="canvas-container"]');
  const svg = page.locator('[data-testid="canvas-svg"]');
  await expect(svg).toBeVisible();
  const containerBox = await container.boundingBox();
  const svgBox = await svg.boundingBox();
  expect(svgBox!.height).toBeGreaterThanOrEqual(containerBox!.height - 1);
});

test('print guide rectangle is visible', async ({ page }) => {
  await page.goto('/');
  const guide = page.locator('[data-testid="print-guide-layer"] rect');
  await expect(guide).toBeVisible();
  const box = await guide.boundingBox();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(100);
});

test('grid lines are present within printable area', async ({ page }) => {
  await page.goto('/');
  const grid = page.locator('[data-testid="grid-layer"]');
  await expect(grid).toBeVisible();
  const lines = grid.locator('line');
  expect(await lines.count()).toBeGreaterThan(10);
});
