/**
 * Shared print geometry — used by both PDF export and CSS print SVG.
 */

/** US Letter dimensions in mm. */
export const PAGE_WIDTH_MM = 215.9;
export const PAGE_HEIGHT_MM = 279.4;
export const MARGIN_MM = 15;
export const PRINTABLE_WIDTH_MM = PAGE_WIDTH_MM - 2 * MARGIN_MM; // 185.9
export const PRINTABLE_HEIGHT_MM = PAGE_HEIGHT_MM - 2 * MARGIN_MM; // 249.4

/** Witness segment: 50mm, positioned at bottom-right of printable area. */
export function witnessSegmentCoords(landscape: boolean) {
  const pw = landscape ? PRINTABLE_HEIGHT_MM : PRINTABLE_WIDTH_MM;
  const ph = landscape ? PRINTABLE_WIDTH_MM : PRINTABLE_HEIGHT_MM;

  const y = ph - 8;
  const x2 = pw - 5;
  const x1 = x2 - 50;

  return { x1, y1: y, x2, y2: y, labelX: (x1 + x2) / 2, labelY: y + 5 };
}

/** Footer text position: bottom-left of printable area. */
export function footerCoords(landscape: boolean) {
  const ph = landscape ? PRINTABLE_WIDTH_MM : PRINTABLE_HEIGHT_MM;
  return { x: 5, y: ph - 3 };
}

/** Check if a point (construction mm) is within the printable area. */
export function isInPrintableArea(x: number, y: number, landscape: boolean): boolean {
  const pw = landscape ? PRINTABLE_HEIGHT_MM : PRINTABLE_WIDTH_MM;
  const ph = landscape ? PRINTABLE_WIDTH_MM : PRINTABLE_HEIGHT_MM;
  return x >= 0 && x <= pw && y >= 0 && y <= ph;
}
