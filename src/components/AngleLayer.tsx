import { memo } from 'react';
import type { AngleInfo, ViewportState, DisplayMode } from '@/model/types';
import { CANVAS_ANGLE, CANVAS_GUIDE } from '@/config/theme';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { MIN_CANVAS_FONT_PX, POINT_DISPLAY_RADIUS_MM } from '@/config/accessibility';

interface AngleLayerProps {
  readonly angles: readonly AngleInfo[];
  readonly points: ReadonlyMap<string, { x: number; y: number }>;
  readonly viewport: ViewportState;
  readonly displayMode: DisplayMode;
  readonly cluttered: boolean;
  readonly selectedElementId: string | null;
  readonly hoveredElementId: string | null;
  /** IDs of segments in the selected figure (to show all angles). */
  readonly selectedFigurePointIds?: readonly string[];
  /** When true, congruence arcs are hidden. */
  readonly hideProperties?: boolean;
  readonly fontScale?: number;
  readonly estimationMode?: boolean;
}

const ARC_RADIUS_PX = 22;
const SQUARE_SIZE_PX = 12;

/**
 * Renders angle arcs and markers on the canvas SVG.
 * Handles visual clutter: hides when cluttered, shows on hover/selection.
 */
export const AngleLayer = memo(function AngleLayer({
  angles,
  points,
  viewport,
  displayMode,
  cluttered,
  selectedElementId,
  hoveredElementId,
  selectedFigurePointIds,
  hideProperties,
  fontScale = 1,
  estimationMode = false,
}: AngleLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

  // Build congruence groups for angle arcs (±0.5° tolerance, spec §8.3)
  const congruenceArcCount = new Map<number, number>(); // index → number of arcs
  if (!hideProperties) {
    const degreeGroups = new Map<number, number[]>(); // rounded degree → angle indices
    angles.forEach((angle, idx) => {
      if (angle.classification === 'droit') return; // right angles use square
      const rounded = Math.round(angle.degrees * 2) / 2; // 0.5° precision
      const group = degreeGroups.get(rounded) ?? [];
      group.push(idx);
      degreeGroups.set(rounded, group);
    });
    let arcCounter = 1;
    const groupArcMap = new Map<number, number>(); // rounded degree → arc count
    for (const [deg, indices] of degreeGroups) {
      if (indices.length >= 2) {
        if (!groupArcMap.has(deg)) {
          groupArcMap.set(deg, arcCounter++);
        }
        for (const idx of indices) {
          congruenceArcCount.set(idx, groupArcMap.get(deg)!);
        }
      }
    }
  }

  return (
    <g data-testid="angle-layer">
      {angles.map((angle, index) => {
        const vertex = points.get(angle.vertexPointId);
        const ray1 = points.get(angle.ray1PointId);
        const ray2 = points.get(angle.ray2PointId);
        if (!vertex || !ray1 || !ray2) return null;

        // Check visibility (clutter management)
        if (cluttered) {
          const isVertexHovered = hoveredElementId === angle.vertexPointId;
          const isVertexSelected = selectedElementId === angle.vertexPointId;
          const isInSelectedFigure = selectedFigurePointIds?.includes(angle.vertexPointId);
          // Also show if a connected segment is hovered
          const isSegmentHovered =
            hoveredElementId !== null &&
            angles.some(
              (a) =>
                a.vertexPointId === angle.vertexPointId &&
                (a.ray1PointId === hoveredElementId || a.ray2PointId === hoveredElementId),
            );

          if (!isVertexHovered && !isVertexSelected && !isInSelectedFigure && !isSegmentHovered) {
            return null;
          }
        }

        const sx = (vertex.x - viewport.panX) * pxPerMm;
        const sy = (vertex.y - viewport.panY) * pxPerMm;

        // Compute arc start and end angles
        const dx1 = ray1.x - vertex.x;
        const dy1 = ray1.y - vertex.y;
        const dx2 = ray2.x - vertex.x;
        const dy2 = ray2.y - vertex.y;
        const startAngle = Math.atan2(dy1, dx1);
        const endAngle = Math.atan2(dy2, dx2);

        // Right angle: square marker offset past the point circle
        if (angle.classification === 'droit') {
          const cos1 = Math.cos(startAngle);
          const sin1 = Math.sin(startAngle);
          const cos2 = Math.cos(endAngle);
          const sin2 = Math.sin(endAngle);

          // Offset so the square starts at the edge of the point circle
          const pointRadiusPx = POINT_DISPLAY_RADIUS_MM * CSS_PX_PER_MM;
          const off = pointRadiusPx * 0.7; // slightly inside edge (diagonal)
          const s = SQUARE_SIZE_PX;
          const path = [
            `M ${sx + cos1 * (s + off)} ${sy + sin1 * (s + off)}`,
            `L ${sx + cos1 * (s + off) + cos2 * (s + off)} ${sy + sin1 * (s + off) + sin2 * (s + off)}`,
            `L ${sx + cos2 * (s + off)} ${sy + sin2 * (s + off)}`,
          ].join(' ');

          return (
            <path
              key={index}
              d={path}
              fill="none"
              stroke={CANVAS_GUIDE}
              strokeWidth={2}
              data-testid={`angle-right-${index}`}
            />
          );
        }

        // Arc for non-right angles
        // Compute the CCW sweep from ray1 to ray2
        let ccwSweep = endAngle - startAngle;
        if (ccwSweep < 0) ccwSweep += 2 * Math.PI;

        // We want the smaller angle (≤180°) — determine which direction to sweep
        const useSmallArc = ccwSweep <= Math.PI;

        const r = ARC_RADIUS_PX;

        // If using small arc, sweep CCW from start to end (sweepFlag=1)
        // If using large arc complement, sweep CW from start to end (sweepFlag=0)
        let arcStart: number, arcEnd: number, sweepFlag: number;
        if (useSmallArc) {
          arcStart = startAngle;
          arcEnd = endAngle;
          sweepFlag = 1; // CCW in SVG coords
        } else {
          arcStart = startAngle;
          arcEnd = endAngle;
          sweepFlag = 0; // CW — takes the short way around
        }

        const x1 = sx + Math.cos(arcStart) * r;
        const y1 = sy + Math.sin(arcStart) * r;
        const x2 = sx + Math.cos(arcEnd) * r;
        const y2 = sy + Math.sin(arcEnd) * r;
        const largeArc = 0; // Always small arc (we chose the sweep direction)

        const arcPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;

        // Degree label position (midpoint of the displayed arc)
        const midAngle = useSmallArc
          ? startAngle + ccwSweep / 2
          : startAngle - (2 * Math.PI - ccwSweep) / 2;
        const labelR = r + 12;
        const labelX = sx + Math.cos(midAngle) * labelR;
        const labelY = sy + Math.sin(midAngle) * labelR;

        return (
          <g key={index}>
            <path
              d={arcPath}
              fill="none"
              stroke={CANVAS_ANGLE}
              strokeWidth={1.5}
              data-testid={`angle-arc-${index}`}
            />
            {/* Obtus marker: small bar perpendicular to arc at midpoint (spec §13.4) */}
            {angle.classification === 'obtus' &&
              (() => {
                const barLen = 5;
                const barMx = sx + Math.cos(midAngle) * r;
                const barMy = sy + Math.sin(midAngle) * r;
                const perpX = -Math.sin(midAngle) * barLen;
                const perpY = Math.cos(midAngle) * barLen;
                return (
                  <line
                    x1={barMx - perpX}
                    y1={barMy - perpY}
                    x2={barMx + perpX}
                    y2={barMy + perpY}
                    stroke={CANVAS_ANGLE}
                    strokeWidth={1.5}
                  />
                );
              })()}
            {/* Congruence arcs: additional concentric arcs for equal angles */}
            {congruenceArcCount.has(index) &&
              Array.from({ length: congruenceArcCount.get(index)! - 1 }, (_, i) => {
                const extraR = r + (i + 1) * 3;
                const ex1 = sx + Math.cos(arcStart) * extraR;
                const ey1 = sy + Math.sin(arcStart) * extraR;
                const ex2 = sx + Math.cos(arcEnd) * extraR;
                const ey2 = sy + Math.sin(arcEnd) * extraR;
                return (
                  <path
                    key={`congruence-${i}`}
                    d={`M ${ex1} ${ey1} A ${extraR} ${extraR} 0 ${largeArc} ${sweepFlag} ${ex2} ${ey2}`}
                    fill="none"
                    stroke={CANVAS_ANGLE}
                    strokeWidth={1}
                    opacity={0.7}
                  />
                );
              })}
            {/* 3e cycle: show degrees — hidden in estimation mode */}
            {displayMode === 'complet' && !estimationMode && (
              <text
                x={labelX}
                y={labelY}
                fill={CANVAS_ANGLE}
                fontSize={Math.max(MIN_CANVAS_FONT_PX, 11) * fontScale}
                fontFamily="system-ui, sans-serif"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {Math.round(angle.degrees)}°
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});
