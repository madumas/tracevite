import { memo, useMemo } from 'react';
import type { ConstructionState } from '@/model/types';
import { formatLength } from '@/engine/format';
import {
  getPrintableArea,
  witnessSegmentCoords,
  footerCoords,
  isInPrintableArea,
} from '@/engine/print-shared';
import { constructionBoundingBox } from '@/engine/pdf-export';
import { computeDerived } from '@/engine/derived';
import { isAngleCluttered } from '@/engine/angles';
import type { PageFormat } from '@/model/preferences';

interface PrintSvgProps {
  readonly state: ConstructionState;
  readonly landscape: boolean;
  readonly pageFormat?: PageFormat;
  readonly includeMeasurements?: boolean;
  readonly includeConsigne?: boolean;
}

/**
 * Dedicated print SVG — display:none normally, display:block in @media print.
 * viewBox in mm (D5), B&W, witness segment, footer.
 * Mirrors the PDF export rendering for consistent output.
 */
export const PrintSvg = memo(function PrintSvg({
  state,
  landscape,
  pageFormat = 'letter',
  includeMeasurements = true,
  includeConsigne = false,
}: PrintSvgProps) {
  const area = getPrintableArea(pageFormat, landscape);
  const pw = area.width;
  const ph = area.height;
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const ws = witnessSegmentCoords(landscape, pageFormat);
  const ft = footerCoords(landscape, pageFormat);

  // Auto-center construction (same logic as PDF export)
  const bb = constructionBoundingBox(state);
  const offsetX = bb ? (bb.width <= pw ? (pw - bb.width) / 2 - bb.minX : -bb.minX) : 0;
  const offsetY = bb ? (bb.height <= ph ? (ph - bb.height) / 2 - bb.minY : -bb.minY) : 0;

  // Derived properties for conventional marks and angles
  const derived = useMemo(
    () => (includeMeasurements ? computeDerived(state, state.displayMode) : null),
    [state, includeMeasurements],
  );
  const cluttered = useMemo(
    () => (includeMeasurements ? isAngleCluttered(state, state.displayMode) : false),
    [state, includeMeasurements],
  );

  // Parallel chevron count per segment
  const parallelSegChevrons = useMemo(() => {
    if (!derived || state.hideProperties) return new Map<string, number>();
    const map = new Map<string, number>();
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
      for (const id of groups[i]!) map.set(id, i + 1);
    }
    return map;
  }, [derived, state.hideProperties]);

  // Congruence ticks map
  const segToTicks = useMemo(() => {
    if (!derived || state.hideProperties) return new Map<string, number>();
    const map = new Map<string, number>();
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
      map.set(segId, groupTicks.get(groupIdx)!);
    }
    return map;
  }, [derived, state.hideProperties]);

  const ARC_RADIUS_MM = 5;
  const SQUARE_SIZE_MM = 3;
  const ARC_SAMPLES = 24;

  return (
    <svg
      className="print-svg"
      width={`${pw}mm`}
      height={`${ph}mm`}
      viewBox={`0 0 ${pw} ${ph}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'none' }}
      data-testid="print-svg"
    >
      {/* Consigne */}
      {includeConsigne && state.consigne && (
        <text x={0} y={-3} fontSize={3.2} fill="#555" fontStyle="italic">
          Consigne : {state.consigne}
        </text>
      )}

      {/* Construction elements — offset for auto-centering */}
      <g transform={`translate(${offsetX},${offsetY})`}>
        {/* Segments */}
        {state.segments.map((seg) => {
          const start = pointMap.get(seg.startPointId);
          const end = pointMap.get(seg.endPointId);
          if (!start || !end) return null;
          if (
            !isInPrintableArea(start.x + offsetX, start.y + offsetY, landscape, pageFormat) &&
            !isInPrintableArea(end.x + offsetX, end.y + offsetY, landscape, pageFormat)
          )
            return null;

          const mx = (start.x + end.x) / 2;
          const my = (start.y + end.y) / 2;

          return (
            <g key={seg.id}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#000"
                strokeWidth={0.5}
              />
              {includeMeasurements && (
                <text x={mx + 2} y={my - 2} fontSize={2.8} fill="#555">
                  {formatLength(seg.lengthMm, state.displayUnit)}
                </text>
              )}
            </g>
          );
        })}

        {/* Conventional marks: parallel bars & congruence ticks */}
        {includeMeasurements &&
          !state.hideProperties &&
          state.segments.map((seg) => {
            const start = pointMap.get(seg.startPointId);
            const end = pointMap.get(seg.endPointId);
            if (!start || !end) return null;

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) return null;

            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const perpX = -dy / len;
            const perpY = dx / len;
            const alongX = dx / len;
            const alongY = dy / len;
            const markLen = 2;

            const marks: React.ReactElement[] = [];

            // Offset marks when both parallel and congruence present
            const hasChevrons = parallelSegChevrons.has(seg.id);
            const hasTicks = segToTicks.has(seg.id);
            const spread = hasChevrons && hasTicks ? 3 : 0;
            const parMidX = midX - alongX * spread;
            const parMidY = midY - alongY * spread;
            const congMidX = midX + alongX * spread;
            const congMidY = midY + alongY * spread;

            // Parallel chevrons (>, >>, >>>)
            const chevronCount = parallelSegChevrons.get(seg.id);
            if (chevronCount) {
              const chevronSpacing = 2;
              const h = 1.5;
              const w = 1;
              const totalCW = (chevronCount - 1) * chevronSpacing;
              for (let i = 0; i < chevronCount; i++) {
                const off = -totalCW / 2 + i * chevronSpacing;
                const cx = parMidX + alongX * off;
                const cy = parMidY + alongY * off;
                marks.push(
                  <polyline
                    key={`par-${seg.id}-${i}`}
                    points={`${cx - alongX * w + perpX * h},${cy - alongY * w + perpY * h} ${cx},${cy} ${cx - alongX * w - perpX * h},${cy - alongY * w - perpY * h}`}
                    fill="none"
                    stroke="#000"
                    strokeWidth={0.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />,
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
                marks.push(
                  <line
                    key={`tick-${seg.id}-${i}`}
                    x1={cx - perpX * markLen}
                    y1={cy - perpY * markLen}
                    x2={cx + perpX * markLen}
                    y2={cy + perpY * markLen}
                    stroke="#000"
                    strokeWidth={0.3}
                  />,
                );
              }
            }

            return marks.length > 0 ? <g key={`marks-${seg.id}`}>{marks}</g> : null;
          })}

        {/* Angle arcs and right-angle squares */}
        {includeMeasurements &&
          derived &&
          derived.angles.map((angle, idx) => {
            const vertex = pointMap.get(angle.vertexPointId);
            const ray1Pt = pointMap.get(angle.ray1PointId);
            const ray2Pt = pointMap.get(angle.ray2PointId);
            if (!vertex || !ray1Pt || !ray2Pt) return null;

            const dx1 = ray1Pt.x - vertex.x;
            const dy1 = ray1Pt.y - vertex.y;
            const dx2 = ray2Pt.x - vertex.x;
            const dy2 = ray2Pt.y - vertex.y;
            const startAngle = Math.atan2(dy1, dx1);
            const endAngle = Math.atan2(dy2, dx2);

            if (angle.classification === 'droit') {
              const cos1 = Math.cos(startAngle);
              const sin1 = Math.sin(startAngle);
              const cos2 = Math.cos(endAngle);
              const sin2 = Math.sin(endAngle);
              const s = SQUARE_SIZE_MM;

              const p1x = vertex.x + cos1 * s;
              const p1y = vertex.y + sin1 * s;
              const p2x = vertex.x + cos1 * s + cos2 * s;
              const p2y = vertex.y + sin1 * s + sin2 * s;
              const p3x = vertex.x + cos2 * s;
              const p3y = vertex.y + sin2 * s;

              return (
                <g key={`angle-${idx}`}>
                  <line
                    x1={p1x}
                    y1={p1y}
                    x2={p2x}
                    y2={p2y}
                    stroke="#333"
                    strokeWidth={0.3}
                    fill="none"
                  />
                  <line
                    x1={p2x}
                    y1={p2y}
                    x2={p3x}
                    y2={p3y}
                    stroke="#333"
                    strokeWidth={0.3}
                    fill="none"
                  />
                </g>
              );
            }

            // Arc polyline for non-right angles
            let ccwSweep = endAngle - startAngle;
            if (ccwSweep < 0) ccwSweep += 2 * Math.PI;
            const useSmallArc = ccwSweep <= Math.PI;
            const sweep = useSmallArc ? ccwSweep : -(2 * Math.PI - ccwSweep);
            const r = ARC_RADIUS_MM;

            const arcLines: React.ReactElement[] = [];
            for (let i = 0; i < ARC_SAMPLES; i++) {
              const t0 = startAngle + (sweep * i) / ARC_SAMPLES;
              const t1 = startAngle + (sweep * (i + 1)) / ARC_SAMPLES;
              arcLines.push(
                <line
                  key={`arc-${idx}-${i}`}
                  x1={vertex.x + Math.cos(t0) * r}
                  y1={vertex.y + Math.sin(t0) * r}
                  x2={vertex.x + Math.cos(t1) * r}
                  y2={vertex.y + Math.sin(t1) * r}
                  stroke="#333"
                  strokeWidth={0.3}
                />,
              );
            }

            // Degree label (complet mode, not cluttered)
            if (state.displayMode === 'complet' && !cluttered) {
              const midT = startAngle + sweep / 2;
              const labelR = r + 3;
              const labelX = vertex.x + Math.cos(midT) * labelR;
              const labelY = vertex.y + Math.sin(midT) * labelR;
              arcLines.push(
                <text
                  key={`deg-${idx}`}
                  x={labelX}
                  y={labelY}
                  fontSize={2.5}
                  fill="#333"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {Math.round(angle.degrees)}°
                </text>,
              );
            }

            return <g key={`angle-${idx}`}>{arcLines}</g>;
          })}

        {/* Circles */}
        {state.circles.map((circle) => {
          const center = pointMap.get(circle.centerPointId);
          if (!center) return null;
          return (
            <circle
              key={circle.id}
              cx={center.x}
              cy={center.y}
              r={circle.radiusMm}
              fill="none"
              stroke="#000"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Points */}
        {state.points.map((point) => {
          if (!isInPrintableArea(point.x + offsetX, point.y + offsetY, landscape, pageFormat))
            return null;
          return (
            <g key={point.id}>
              <circle cx={point.x} cy={point.y} r={1} fill="#000" />
              <text x={point.x + 2} y={point.y - 2} fontSize={3.5} fill="#000">
                {point.label}
              </text>
            </g>
          );
        })}
      </g>

      {/* Witness segment (fixed position, not offset) */}
      <line x1={ws.x1} y1={ws.y1} x2={ws.x2} y2={ws.y2} stroke="#000" strokeWidth={0.5} />
      <text x={ws.labelX} y={ws.labelY} fontSize={2.5} fill="#999" textAnchor="middle">
        vérification : ce segment mesure 5 cm
      </text>

      {/* Footer */}
      <text x={ft.x} y={ft.y} fontSize={2.5} fill="#999">
        GéoMolo — Échelle 1:1 — geomolo.ca
      </text>
    </svg>
  );
});
