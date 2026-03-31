import { type Page, expect } from '@playwright/test';

// Mirrors src/engine/viewport.ts
const BOUNDS_WIDTH_MM = 215.9 * 2; // ~431.8mm

/**
 * Read the actual pxPerMm from the rendered SVG width attribute.
 * SVG width = BOUNDS_WIDTH_MM * pxPerMm, so pxPerMm = width / BOUNDS_WIDTH_MM.
 */
export async function getPxPerMm(page: Page): Promise<number> {
  const svg = page.locator('[data-testid="canvas-svg"]');
  const widthAttr = await svg.getAttribute('width');
  if (!widthAttr) throw new Error('SVG width attribute not found');
  return parseFloat(widthAttr) / BOUNDS_WIDTH_MM;
}

/**
 * Convert mm coordinates to page coordinates and click on the canvas.
 * Assumes pan = (0, 0) which is the default on fresh load.
 */
export async function clickCanvas(page: Page, xMm: number, yMm: number): Promise<void> {
  const svg = page.locator('[data-testid="canvas-svg"]');
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG bounding box not found');

  const pxPerMm = await getPxPerMm(page);
  const pageX = box.x + xMm * pxPerMm;
  const pageY = box.y + yMm * pxPerMm;

  // Validate coordinates are within visible area
  expect(pageX).toBeGreaterThanOrEqual(box.x);
  expect(pageX).toBeLessThanOrEqual(box.x + box.width);
  expect(pageY).toBeGreaterThanOrEqual(box.y);
  expect(pageY).toBeLessThanOrEqual(box.y + box.height);

  await page.mouse.click(pageX, pageY);
  // Wait for the app's 150ms click debounce (CLICK_DEBOUNCE_MS) to settle
  await page.waitForTimeout(200);
}

/**
 * Touch-tap on the canvas at mm coordinates.
 * Waits 100ms after tap for the 80ms touch delay in usePointerInteraction.
 */
export async function tapCanvas(page: Page, xMm: number, yMm: number): Promise<void> {
  const svg = page.locator('[data-testid="canvas-svg"]');
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG bounding box not found');

  const pxPerMm = await getPxPerMm(page);
  const pageX = box.x + xMm * pxPerMm;
  const pageY = box.y + yMm * pxPerMm;

  expect(pageX).toBeGreaterThanOrEqual(box.x);
  expect(pageX).toBeLessThanOrEqual(box.x + box.width);
  expect(pageY).toBeGreaterThanOrEqual(box.y);
  expect(pageY).toBeLessThanOrEqual(box.y + box.height);

  await page.touchscreen.tap(pageX, pageY);
  // 80ms touch delay in usePointerInteraction + 150ms click debounce
  await page.waitForTimeout(300);
}

/**
 * Move cursor over canvas at mm position (for ghost segment preview).
 */
export async function moveOnCanvas(page: Page, xMm: number, yMm: number): Promise<void> {
  const svg = page.locator('[data-testid="canvas-svg"]');
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG bounding box not found');

  const pxPerMm = await getPxPerMm(page);
  await page.mouse.move(box.x + xMm * pxPerMm, box.y + yMm * pxPerMm);
}
