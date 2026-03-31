/**
 * Shared print geometry — used by both PDF export and CSS print SVG.
 */

import type { PageFormat } from '@/model/preferences';

/** US Letter dimensions in mm. */
export const PAGE_WIDTH_MM = 215.9;
export const PAGE_HEIGHT_MM = 279.4;

/** A4 dimensions in mm. */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const MARGIN_MM = 15;

// Legacy constants (Letter format) — kept for backward compat
export const PRINTABLE_WIDTH_MM = PAGE_WIDTH_MM - 2 * MARGIN_MM; // 185.9
export const PRINTABLE_HEIGHT_MM = PAGE_HEIGHT_MM - 2 * MARGIN_MM; // 249.4

/** Get page dimensions for a given format. */
export function getPageDimensions(pageFormat: PageFormat): { width: number; height: number } {
  if (pageFormat === 'a4') {
    return { width: A4_WIDTH_MM, height: A4_HEIGHT_MM };
  }
  return { width: PAGE_WIDTH_MM, height: PAGE_HEIGHT_MM };
}

/** Get printable area dimensions (page minus margins) for a given format and orientation. */
export function getPrintableArea(
  pageFormat: PageFormat,
  landscape: boolean,
): { width: number; height: number } {
  const page = getPageDimensions(pageFormat);
  const pw = page.width - 2 * MARGIN_MM;
  const ph = page.height - 2 * MARGIN_MM;
  return landscape ? { width: ph, height: pw } : { width: pw, height: ph };
}

/** Witness segment: 50mm, positioned at bottom-right of printable area. */
export function witnessSegmentCoords(landscape: boolean, pageFormat: PageFormat = 'letter') {
  const area = getPrintableArea(pageFormat, landscape);

  const y = area.height - 8;
  const x2 = area.width - 5;
  const x1 = x2 - 50;

  return { x1, y1: y, x2, y2: y, labelX: (x1 + x2) / 2, labelY: y + 5 };
}

/** Footer text position: bottom-left of printable area. */
export function footerCoords(landscape: boolean, pageFormat: PageFormat = 'letter') {
  const area = getPrintableArea(pageFormat, landscape);
  return { x: 5, y: area.height - 3 };
}

/** Check if a point (construction mm) is within the printable area. */
export function isInPrintableArea(
  x: number,
  y: number,
  landscape: boolean,
  pageFormat: PageFormat = 'letter',
): boolean {
  const area = getPrintableArea(pageFormat, landscape);
  return x >= 0 && x <= area.width && y >= 0 && y <= area.height;
}
