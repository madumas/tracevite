import { memo } from 'react';
import type { AngleInfo, ViewportState, SchoolLevel } from '@/model/types';
import { CANVAS_ANGLE, CANVAS_GUIDE } from '@/config/theme';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { MIN_CANVAS_FONT_PX } from '@/config/accessibility';

interface AngleLayerProps {
  readonly angles: readonly AngleInfo[];
  readonly points: ReadonlyMap<string, { x: number; y: number }>;
  readonly viewport: ViewportState;
  readonly schoolLevel: SchoolLevel;
  readonly cluttered: boolean;
  readonly selectedElementId: string | null;
  readonly hoveredElementId: string | null;
  /** IDs of segments in the selected figure (to show all angles). */
  readonly selectedFigurePointIds?: readonly string[];
}

const ARC_RADIUS_PX = 15;
const SQUARE_SIZE_PX = 12;

/**
 * Renders angle arcs and markers on the canvas SVG.
 * Handles visual clutter: hides when cluttered, shows on hover/selection.
 */
export const AngleLayer = memo(function AngleLayer({
  angles,
  points,
  viewport,
  schoolLevel,
  cluttered,
  selectedElementId,
  hoveredElementId,
  selectedFigurePointIds,
}: AngleLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

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

        // Right angle: small square
        if (angle.classification === 'droit') {
          const cos1 = Math.cos(startAngle);
          const sin1 = Math.sin(startAngle);
          const cos2 = Math.cos(endAngle);
          const sin2 = Math.sin(endAngle);

          const s = SQUARE_SIZE_PX;
          const path = [
            `M ${sx + cos1 * s} ${sy + sin1 * s}`,
            `L ${sx + cos1 * s + cos2 * s} ${sy + sin1 * s + sin2 * s}`,
            `L ${sx + cos2 * s} ${sy + sin2 * s}`,
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
            {/* 3e cycle: show degrees */}
            {schoolLevel === '3e_cycle' && (
              <text
                x={labelX}
                y={labelY}
                fill={CANVAS_ANGLE}
                fontSize={Math.max(MIN_CANVAS_FONT_PX, 11)}
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
