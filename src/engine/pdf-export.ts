/**
 * PDF 1:1 export via jsPDF.
 * Vectorial, B&W, US Letter, 15mm margins.
 * /PrintScaling /None to prevent browser scaling.
 */

import { jsPDF } from 'jspdf';
import type { ConstructionState } from '@/model/types';
import type { PageFormat } from '@/model/preferences';
import { computeDerived } from './derived';
import { isAngleCluttered } from './angles';
import { formatLength } from './format';
import {
  MARGIN_MM,
  getPrintableArea,
  getPageDimensions,
  witnessSegmentCoords,
  footerCoords,
  isInPrintableArea,
} from './print-shared';

export interface PdfOptions {
  landscape: boolean;
  includeConsigne: boolean;
  includeGrid: boolean;
  includeMeasurements: boolean;
  pageFormat: PageFormat;
}

/**
 * Generate a 1:1 scale PDF of the construction.
 * Returns the jsPDF document (caller triggers download).
 */
export function generatePDF(state: ConstructionState, options: PdfOptions): jsPDF {
  const { landscape, includeConsigne, includeGrid, includeMeasurements, pageFormat } = options;
  const orientation = landscape ? 'landscape' : 'portrait';
  const area = getPrintableArea(pageFormat, landscape);
  const pw = area.width;
  const ph = area.height;
  const pageDims = getPageDimensions(pageFormat);
  const jspdfFormat: [number, number] = [pageDims.width, pageDims.height];

  const doc = new jsPDF({ orientation, unit: 'mm', format: jspdfFormat });

  // Set /PrintScaling /None viewer preference (D4)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).internal.events.subscribe('putCatalog', function (this: any) {
    this.internal.write('/ViewerPreferences<</PrintScaling/None>>');
  });

  const pointMap = new Map(state.points.map((p) => [p.id, p]));

  // Auto-center construction in printable area (1:1 scale preserved).
  // If figure is larger than the page, align top-left so maximum content is visible.
  const bb = constructionBoundingBox(state);
  const offsetX = bb
    ? bb.width <= pw
      ? (pw - bb.width) / 2 - bb.minX // center horizontally
      : -bb.minX // align left
    : 0;
  const offsetY = bb
    ? bb.height <= ph
      ? (ph - bb.height) / 2 - bb.minY // center vertically
      : -bb.minY // align top
    : 0;
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
      !isInPrintableArea(start.x + offsetX, start.y + offsetY, landscape, pageFormat) &&
      !isInPrintableArea(end.x + offsetX, end.y + offsetY, landscape, pageFormat)
    )
      continue;

    doc.line(tx(start.x), ty(start.y), tx(end.x), ty(end.y));

    // Length label at midpoint (8pt dark gray) — omitted in "figure only" mode
    if (includeMeasurements) {
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      doc.setFontSize(8);
      doc.setTextColor(80);
      const lengthText = formatLength(seg.lengthMm, state.displayUnit);
      doc.text(lengthText, tx(mx) + 2, ty(my) - 2);
    }
  }

  // ── Conventional marks (parallel bars, congruence ticks) ──
  if (!state.hideProperties && includeMeasurements) {
    const derived = computeDerived(state, state.displayMode);
    doc.setLineWidth(0.3);
    doc.setDrawColor(0);

    // Parallel chevrons: group segments and assign chevron count (>, >>, >>>)
    const parallelSegChevrons = new Map<string, number>();
    {
      const groups: string[][] = [];
      const segToGroup = new Map<string, number>();
      for (const prop of derived.properties) {
        if (prop.type === 'parallel') {
          const ids = [...prop.involvedIds];
          const existing = ids.map((id) => segToGroup.get(id)).find((g) => g !== undefined);
          if (existing !== undefined) {
            for (const id of ids) {
              segToGroup.set(id, existing);
              if (!groups[existing]!.includes(id)) groups[existing]!.push(id);
            }
          } else {
            const idx = groups.length;
            groups.push(ids);
            for (const id of ids) segToGroup.set(id, idx);
          }
        }
      }
      for (let i = 0; i < groups.length; i++) {
        for (const id of groups[i]!) parallelSegChevrons.set(id, i + 1);
      }
    }

    // Congruence groups
    const segToTicks = new Map<string, number>();
    const equalGroups: string[][] = [];
    for (const prop of derived.properties) {
      if (prop.type === 'equal_length') equalGroups.push([...prop.involvedIds]);
    }
    const segToGroup = new Map<string, number>();
    for (const group of equalGroups) {
      const existing = group.map((id) => segToGroup.get(id)).find((g) => g !== undefined);
      const groupIdx = existing ?? equalGroups.indexOf(group);
      for (const id of group) segToGroup.set(id, groupIdx);
    }
    const groupTicks = new Map<number, number>();
    let tickCounter = 1;
    for (const [segId, groupIdx] of segToGroup) {
      if (!groupTicks.has(groupIdx)) groupTicks.set(groupIdx, tickCounter++);
      segToTicks.set(segId, groupTicks.get(groupIdx)!);
    }

    for (const seg of state.segments) {
      const start = pointMap.get(seg.startPointId);
      const end = pointMap.get(seg.endPointId);
      if (!start || !end) continue;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      // Perpendicular direction (unit)
      const perpX = -dy / len;
      const perpY = dx / len;
      // Along direction (unit)
      const alongX = dx / len;
      const alongY = dy / len;
      const markLen = 2; // mm half-length of each tick

      // Offset marks when both parallel and congruence present on same segment
      const hasChevrons = parallelSegChevrons.has(seg.id);
      const hasTicks = segToTicks.has(seg.id);
      const spread = hasChevrons && hasTicks ? 3 : 0; // mm
      const parMidX = midX - alongX * spread;
      const parMidY = midY - alongY * spread;
      const congMidX = midX + alongX * spread;
      const congMidY = midY + alongY * spread;

      // Parallel chevrons (>, >>, >>>)
      const chevrons = parallelSegChevrons.get(seg.id);
      if (chevrons) {
        const chevronSpacing = 2;
        const h = 1.5;
        const w = 1;
        const totalW = (chevrons - 1) * chevronSpacing;
        for (let i = 0; i < chevrons; i++) {
          const off = -totalW / 2 + i * chevronSpacing;
          const cx = parMidX + alongX * off;
          const cy = parMidY + alongY * off;
          doc.line(
            tx(cx - alongX * w + perpX * h),
            ty(cy - alongY * w + perpY * h),
            tx(cx),
            ty(cy),
          );
          doc.line(
            tx(cx - alongX * w - perpX * h),
            ty(cy - alongY * w - perpY * h),
            tx(cx),
            ty(cy),
          );
        }
      }

      // Congruence ticks
      const ticks = segToTicks.get(seg.id);
      if (ticks) {
        const spacing = 1.5;
        const totalW = (ticks - 1) * spacing;
        for (let i = 0; i < ticks; i++) {
          const off = -totalW / 2 + i * spacing;
          const cx = congMidX + alongX * off;
          const cy = congMidY + alongY * off;
          doc.line(
            tx(cx - perpX * markLen),
            ty(cy - perpY * markLen),
            tx(cx + perpX * markLen),
            ty(cy + perpY * markLen),
          );
        }
      }
    }
  }

  // ── Angle arcs and right-angle squares ────────────
  // Angles are measurements, not properties — render even when hideProperties is true.
  if (includeMeasurements) {
    const angleDerived = computeDerived(state, state.displayMode);
    const angles = angleDerived.angles;
    const cluttered = isAngleCluttered(state, state.displayMode);

    const ARC_RADIUS_MM = 5;
    const SQUARE_SIZE_MM = 3;
    const ARC_SAMPLES = 24;

    doc.setDrawColor(51, 51, 51); // #333 dark gray for B&W PDF
    doc.setLineWidth(0.3);

    for (const angle of angles) {
      const vertex = pointMap.get(angle.vertexPointId);
      const ray1Pt = pointMap.get(angle.ray1PointId);
      const ray2Pt = pointMap.get(angle.ray2PointId);
      if (!vertex || !ray1Pt || !ray2Pt) continue;

      // Compute ray directions
      const dx1 = ray1Pt.x - vertex.x;
      const dy1 = ray1Pt.y - vertex.y;
      const dx2 = ray2Pt.x - vertex.x;
      const dy2 = ray2Pt.y - vertex.y;
      const startAngle = Math.atan2(dy1, dx1);
      const endAngle = Math.atan2(dy2, dx2);

      if (angle.classification === 'droit') {
        // Right-angle square: 3 lines forming an open corner
        const cos1 = Math.cos(startAngle);
        const sin1 = Math.sin(startAngle);
        const cos2 = Math.cos(endAngle);
        const sin2 = Math.sin(endAngle);
        const s = SQUARE_SIZE_MM;

        // Three corners of the open square (vertex is implied, not drawn)
        const p1x = vertex.x + cos1 * s;
        const p1y = vertex.y + sin1 * s;
        const p2x = vertex.x + cos1 * s + cos2 * s;
        const p2y = vertex.y + sin1 * s + sin2 * s;
        const p3x = vertex.x + cos2 * s;
        const p3y = vertex.y + sin2 * s;

        doc.line(tx(p1x), ty(p1y), tx(p2x), ty(p2y));
        doc.line(tx(p2x), ty(p2y), tx(p3x), ty(p3y));
      } else {
        // Arc polyline approximation for non-right angles
        let ccwSweep = endAngle - startAngle;
        if (ccwSweep < 0) ccwSweep += 2 * Math.PI;

        // Choose the smaller arc (≤180°)
        const useSmallArc = ccwSweep <= Math.PI;
        const sweep = useSmallArc ? ccwSweep : -(2 * Math.PI - ccwSweep);

        const r = ARC_RADIUS_MM;
        for (let i = 0; i < ARC_SAMPLES; i++) {
          const t0 = startAngle + (sweep * i) / ARC_SAMPLES;
          const t1 = startAngle + (sweep * (i + 1)) / ARC_SAMPLES;
          doc.line(
            tx(vertex.x + Math.cos(t0) * r),
            ty(vertex.y + Math.sin(t0) * r),
            tx(vertex.x + Math.cos(t1) * r),
            ty(vertex.y + Math.sin(t1) * r),
          );
        }

        // Degree label (complet mode only, hidden when cluttered)
        if (state.displayMode === 'complet' && !cluttered) {
          const midT = startAngle + sweep / 2;
          const labelR = r + 3; // slightly beyond the arc
          const labelX = vertex.x + Math.cos(midT) * labelR;
          const labelY = vertex.y + Math.sin(midT) * labelR;
          doc.setFontSize(7);
          doc.setTextColor(51);
          doc.text(`${Math.round(angle.degrees)}°`, tx(labelX), ty(labelY), {
            align: 'center',
          });
        }
      }
    }
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
    if (!isInPrintableArea(point.x + offsetX, point.y + offsetY, landscape, pageFormat)) continue;
    doc.circle(tx(point.x), ty(point.y), 1, 'F');

    // Vertex label (10pt)
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(point.label, tx(point.x) + 3, ty(point.y) - 3);
  }

  // ── Text boxes ────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(0);
  for (const tb of state.textBoxes) {
    if (!tb.text) continue;
    if (!isInPrintableArea(tb.x + offsetX, tb.y + offsetY, landscape, pageFormat)) continue;
    const lines = tb.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i]!, tx(tb.x), ty(tb.y) + i * 4 + 3);
    }
  }

  // ── Witness segment (50mm, bottom-right) ──────────
  const ws = witnessSegmentCoords(landscape, pageFormat);
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(ws.x1 + MARGIN_MM, ws.y1 + MARGIN_MM, ws.x2 + MARGIN_MM, ws.y2 + MARGIN_MM);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('vérification : ce segment mesure 5 cm', ws.labelX + MARGIN_MM, ws.labelY + MARGIN_MM, {
    align: 'center',
  });

  // ── Footer ────────────────────────────────────────
  const ft = footerCoords(landscape, pageFormat);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('GéoMolo — Échelle 1:1', ft.x + MARGIN_MM, ft.y + MARGIN_MM);

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
export function figureFitsInPage(
  state: ConstructionState,
  landscape: boolean,
  pageFormat: PageFormat = 'letter',
): boolean {
  const bb = constructionBoundingBox(state);
  if (!bb) return true;
  const area = getPrintableArea(pageFormat, landscape);
  return bb.width <= area.width && bb.height <= area.height;
}

/**
 * Check if figure is off-center (>60% offset from center of page).
 */
export function figureIsOffCenter(
  state: ConstructionState,
  landscape: boolean,
  pageFormat: PageFormat = 'letter',
): boolean {
  const bb = constructionBoundingBox(state);
  if (!bb) return false;
  const area = getPrintableArea(pageFormat, landscape);

  const figureCenterX = (bb.minX + bb.maxX) / 2;
  const figureCenterY = (bb.minY + bb.maxY) / 2;
  const pageCenterX = area.width / 2;
  const pageCenterY = area.height / 2;

  const offsetRatioX = Math.abs(figureCenterX - pageCenterX) / pageCenterX;
  const offsetRatioY = Math.abs(figureCenterY - pageCenterY) / pageCenterY;

  return offsetRatioX > 0.6 || offsetRatioY > 0.6;
}
