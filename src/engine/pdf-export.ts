/**
 * PDF 1:1 export via jsPDF.
 * Vectorial, B&W, US Letter, 15mm margins.
 * /PrintScaling /None to prevent browser scaling.
 */

import { jsPDF } from 'jspdf';
import type { ConstructionState } from '@/model/types';
import { formatLength } from './format';
import {
  MARGIN_MM,
  PRINTABLE_WIDTH_MM,
  PRINTABLE_HEIGHT_MM,
  witnessSegmentCoords,
  footerCoords,
  isInPrintableArea,
} from './print-shared';

export interface PdfOptions {
  landscape: boolean;
  includeConsigne: boolean;
  includeGrid: boolean;
}

/**
 * Generate a 1:1 scale PDF of the construction.
 * Returns the jsPDF document (caller triggers download).
 */
export function generatePDF(state: ConstructionState, options: PdfOptions): jsPDF {
  const { landscape, includeConsigne, includeGrid } = options;
  const orientation = landscape ? 'landscape' : 'portrait';
  const pw = landscape ? PRINTABLE_HEIGHT_MM : PRINTABLE_WIDTH_MM;
  const ph = landscape ? PRINTABLE_WIDTH_MM : PRINTABLE_HEIGHT_MM;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'letter' });

  // Set /PrintScaling /None viewer preference (D4)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).internal.events.subscribe('putCatalog', function (this: any) {
    this.internal.write('/ViewerPreferences<</PrintScaling/None>>');
  });

  const pointMap = new Map(state.points.map((p) => [p.id, p]));

  // Auto-center construction in printable area (1:1 scale preserved)
  const bb = constructionBoundingBox(state);
  const offsetX = bb ? (pw - bb.width) / 2 - bb.minX : 0;
  const offsetY = bb ? (ph - bb.height) / 2 - bb.minY : 0;
  const tx = (x: number) => x + offsetX + MARGIN_MM;
  const ty = (y: number) => y + offsetY + MARGIN_MM;

  // ── Optional grid (10% gray) ──────────────────────
  if (includeGrid) {
    doc.setDrawColor(230);
    doc.setLineWidth(0.1);
    const gridMm = state.gridSizeMm;
    for (let x = 0; x <= pw; x += gridMm) {
      doc.line(x + MARGIN_MM, MARGIN_MM, x + MARGIN_MM, ph + MARGIN_MM);
    }
    for (let y = 0; y <= ph; y += gridMm) {
      doc.line(MARGIN_MM, y + MARGIN_MM, pw + MARGIN_MM, y + MARGIN_MM);
    }
  }

  // ── Consigne (optional, top of page) ──────────────
  if (includeConsigne && state.consigne) {
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'italic');
    const consigneText = `Consigne : ${state.consigne}`;
    doc.text(consigneText, MARGIN_MM, MARGIN_MM - 3, { maxWidth: pw });
    doc.setFont('helvetica', 'normal');
  }

  // ── Segments (0.5mm black) ────────────────────────
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  for (const seg of state.segments) {
    const start = pointMap.get(seg.startPointId);
    const end = pointMap.get(seg.endPointId);
    if (!start || !end) continue;
    if (
      !isInPrintableArea(start.x + offsetX, start.y + offsetY, landscape) &&
      !isInPrintableArea(end.x + offsetX, end.y + offsetY, landscape)
    )
      continue;

    doc.line(tx(start.x), ty(start.y), tx(end.x), ty(end.y));

    // Length label at midpoint (8pt dark gray)
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    doc.setFontSize(8);
    doc.setTextColor(80);
    const lengthText = formatLength(seg.lengthMm, state.displayUnit);
    doc.text(lengthText, tx(mx) + 2, ty(my) - 2);
  }

  // ── Circles ───────────────────────────────────────
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  for (const circle of state.circles) {
    const center = pointMap.get(circle.centerPointId);
    if (!center) continue;
    doc.circle(tx(center.x), ty(center.y), circle.radiusMm, 'S');
  }

  // ── Points (1mm radius filled) ────────────────────
  doc.setFillColor(0, 0, 0);
  for (const point of state.points) {
    if (!isInPrintableArea(point.x + offsetX, point.y + offsetY, landscape)) continue;
    doc.circle(tx(point.x), ty(point.y), 1, 'F');

    // Vertex label (10pt)
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(point.label, tx(point.x) + 3, ty(point.y) - 3);
  }

  // ── Witness segment (50mm, bottom-right) ──────────
  const ws = witnessSegmentCoords(landscape);
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(ws.x1 + MARGIN_MM, ws.y1 + MARGIN_MM, ws.x2 + MARGIN_MM, ws.y2 + MARGIN_MM);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('vérification : ce segment mesure 5 cm', ws.labelX + MARGIN_MM, ws.labelY + MARGIN_MM, {
    align: 'center',
  });

  // ── Footer ────────────────────────────────────────
  const ft = footerCoords(landscape);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('TraceVite — Échelle 1:1', ft.x + MARGIN_MM, ft.y + MARGIN_MM);

  return doc;
}

/**
 * Compute construction bounding box in mm.
 */
export function constructionBoundingBox(state: ConstructionState): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} | null {
  if (state.points.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of state.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  // Include circles: center ± radius
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  for (const c of state.circles) {
    const center = pointMap.get(c.centerPointId);
    if (!center) continue;
    if (center.x - c.radiusMm < minX) minX = center.x - c.radiusMm;
    if (center.y - c.radiusMm < minY) minY = center.y - c.radiusMm;
    if (center.x + c.radiusMm > maxX) maxX = center.x + c.radiusMm;
    if (center.y + c.radiusMm > maxY) maxY = center.y + c.radiusMm;
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Check if construction fits in printable area.
 */
export function figureFitsInPage(state: ConstructionState, landscape: boolean): boolean {
  const bb = constructionBoundingBox(state);
  if (!bb) return true;
  const pw = landscape ? PRINTABLE_HEIGHT_MM : PRINTABLE_WIDTH_MM;
  const ph = landscape ? PRINTABLE_WIDTH_MM : PRINTABLE_HEIGHT_MM;
  return bb.maxX <= pw && bb.maxY <= ph;
}

/**
 * Check if figure is off-center (>60% offset from center of page).
 */
export function figureIsOffCenter(state: ConstructionState, landscape: boolean): boolean {
  const bb = constructionBoundingBox(state);
  if (!bb) return false;
  const pw = landscape ? PRINTABLE_HEIGHT_MM : PRINTABLE_WIDTH_MM;
  const ph = landscape ? PRINTABLE_WIDTH_MM : PRINTABLE_HEIGHT_MM;

  const figureCenterX = (bb.minX + bb.maxX) / 2;
  const figureCenterY = (bb.minY + bb.maxY) / 2;
  const pageCenterX = pw / 2;
  const pageCenterY = ph / 2;

  const offsetRatioX = Math.abs(figureCenterX - pageCenterX) / pageCenterX;
  const offsetRatioY = Math.abs(figureCenterY - pageCenterY) / pageCenterY;

  return offsetRatioX > 0.6 || offsetRatioY > 0.6;
}
