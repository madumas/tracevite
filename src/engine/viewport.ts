import type { ViewportState } from '@/model/types';

/**
 * Pure viewport/coordinate conversion functions.
 * These are NOT in a hook — they're reusable by any component.
 */

/** US Letter dimensions in mm. */
export const LETTER_WIDTH_MM = 215.9;
export const LETTER_HEIGHT_MM = 279.4;

/** Construction bounds: 2x Letter in each dimension. */
export const BOUNDS_WIDTH_MM = LETTER_WIDTH_MM * 2; // ~432mm
export const BOUNDS_HEIGHT_MM = LETTER_HEIGHT_MM * 2; // ~559mm

/** Zoom limits. */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;

/** Convert mm coordinates to screen (CSS px) coordinates. */
export function mmToScreen(
  xMm: number,
  yMm: number,
  viewport: ViewportState,
  pxPerMm: number,
): { sx: number; sy: number } {
  return {
    sx: (xMm - viewport.panX) * viewport.zoom * pxPerMm,
    sy: (yMm - viewport.panY) * viewport.zoom * pxPerMm,
  };
}

/** Convert screen (CSS px) coordinates to mm. */
export function screenToMm(
  sx: number,
  sy: number,
  viewport: ViewportState,
  pxPerMm: number,
): { x: number; y: number } {
  return {
    x: sx / (viewport.zoom * pxPerMm) + viewport.panX,
    y: sy / (viewport.zoom * pxPerMm) + viewport.panY,
  };
}

/** Convert a physical mm value to CSS pixels. */
export function mmToCssPx(mm: number): number {
  return mm * CSS_PX_PER_MM;
}

/**
 * Compute initial zoom so the full Letter page fits in the window.
 * @param containerWidth - available canvas width in CSS px
 * @param containerHeight - available canvas height in CSS px
 */
export function computeInitialZoom(containerWidth: number, containerHeight: number): number {
  const pxPerMm = 96 / 25.4;
  const zoomX = containerWidth / (LETTER_WIDTH_MM * pxPerMm);
  const zoomY = containerHeight / (LETTER_HEIGHT_MM * pxPerMm);
  const zoom = Math.min(zoomX, zoomY) * 0.95; // 5% margin
  return clampZoom(zoom);
}

/** Clamp zoom to valid range. */
export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/** Clamp viewport pan to keep construction bounds visible.
 *  Allows negative panning (up to -BOUNDS/2) so reflected figures are reachable. */
export function clampViewport(viewport: ViewportState): ViewportState {
  const zoom = clampZoom(viewport.zoom);
  const margin = BOUNDS_WIDTH_MM / 2;
  const panX = Math.max(-margin, Math.min(BOUNDS_WIDTH_MM, viewport.panX));
  const panY = Math.max(-margin, Math.min(BOUNDS_HEIGHT_MM, viewport.panY));
  return { panX, panY, zoom };
}

/** Pixels per mm at CSS level (constant across zoom). */
export const CSS_PX_PER_MM = 96 / 25.4;
