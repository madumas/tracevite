import { memo } from 'react';
import type { AngleInfo, ViewportState, DisplayMode } from '@/model/types';
import { useCanvasColors } from '@/config/theme';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { MIN_CANVAS_FONT_PX, POINT_DISPLAY_RADIUS_MM } from '@/config/accessibility';
import { chooseAngleLabelPosition, type Obstacle } from '@/engine/label-placement';

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
  /** When true, all angles hidden (active drawing gesture — TDC accommodation). */
  readonly activeGestureHideAll?: boolean;
  /** When set, only angles at this vertex are shown (active move gesture). */
  readonly activeVertexPointId?: string;
  /** Pre-computed obstacles per vertex for angle label anti-overlap. */
  readonly angleLabelObstacles?: Map<string, Obstacle[]>;
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
  activeGestureHideAll,
  activeVertexPointId,
  angleLabelObstacles,
}: AngleLayerProps) {
  const colors = useCanvasColors();
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

  // Pre-compute dynamic label positions per vertex to avoid angle-angle and angle-length overlaps
  const angleLabelPositions = new Map<number, { radius: number; angle: number }>();
  if (displayMode === 'complet' && !estimationMode && angleLabelObstacles) {
    const fontSize = Math.max(MIN_CANVAS_FONT_PX, 11) * fontScale;
    const labelH = fontSize * 1.2;

    // Group visible angle indices by vertex
    const vertexGroups = new Map<string, number[]>();
    angles.forEach((angle, idx) => {
      if (angle.classification === 'reflex') return;
      if (angle.classification === 'plat') return; // plat labels add no value in push-out context
      if (angle.classification === 'droit') return; // right angles use square, no text
      const group = vertexGroups.get(angle.vertexPointId) ?? [];
      group.push(idx);
      vertexGroups.set(angle.vertexPointId, group);
    });

    for (const [vertexId, indices] of vertexGroups) {
      const vertex = points.get(vertexId);
      if (!vertex) continue;
      const sx = (vertex.x - viewport.panX) * pxPerMm;
      const sy = (vertex.y - viewport.panY) * pxPerMm;

      // External obstacles (segment length labels) + accumulator for placed labels
      const externalObs = angleLabelObstacles.get(vertexId) ?? [];
      const placedObs: Obstacle[] = [...externalObs];

      // Sort by midAngle for deterministic processing
      const sorted = [...indices].sort((a, b) => {
        const aa = angles[a]!,
          ab = angles[b]!;
        const ray1a = points.get(aa.ray1PointId),
          ray2a = points.get(aa.ray2PointId);
        const ray1b = points.get(ab.ray1PointId),
          ray2b = points.get(ab.ray2PointId);
        if (!ray1a || !ray2a || !ray1b || !ray2b) return 0;
        const midA =
          Math.atan2(ray1a.y - vertex.y, ray1a.x - vertex.x) +
          Math.atan2(ray2a.y - vertex.y, ray2a.x - vertex.x);
        const midB =
          Math.atan2(ray1b.y - vertex.y, ray1b.x - vertex.x) +
          Math.atan2(ray2b.y - vertex.y, ray2b.x - vertex.x);
        return midA - midB;
      });

      for (const idx of sorted) {
        const angle = angles[idx]!;
        const ray1 = points.get(angle.ray1PointId);
        const ray2 = points.get(angle.ray2PointId);
        if (!ray1 || !ray2) continue;

        const startAngle = Math.atan2(ray1.y - vertex.y, ray1.x - vertex.x);
        const endAngle = Math.atan2(ray2.y - vertex.y, ray2.x - vertex.x);
        let ccwSweep = endAngle - startAngle;
        if (ccwSweep < 0) ccwSweep += 2 * Math.PI;
        const useSmallArc = ccwSweep <= Math.PI;
        const midAngle = useSmallArc
          ? startAngle + ccwSweep / 2
          : startAngle - (2 * Math.PI - ccwSweep) / 2;

        const labelText = `${Math.round(angle.degrees)}°`;
        const labelW = labelText.length * fontSize * 0.6;

        const pos = chooseAngleLabelPosition(sx, sy, midAngle, labelW, labelH, placedObs);
        angleLabelPositions.set(idx, pos);

        // Add this label as obstacle for subsequent angles at this vertex
        const cx = sx + Math.cos(pos.angle) * pos.radius;
        const cy = sy + Math.sin(pos.angle) * pos.radius;
        placedObs.push({ x: cx - labelW / 2, y: cy - labelH / 2, width: labelW, height: labelH });
      }
    }
  }

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

        // Accommodation TDC : masquer angles pendant gestes moteurs actifs
        if (activeGestureHideAll) return null;
        if (activeVertexPointId && angle.vertexPointId !== activeVertexPointId) return null;

        // Filter reflex angles — removed from MVP (spec: "hors programme primaire")
        if (angle.classification === 'reflex') return null;
        // Filter flat angles in Simplifié mode (spec: "plat hidden in Simplifié")
        if (displayMode === 'simplifie' && angle.classification === 'plat') return null;

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
              stroke={colors.guide}
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

        // Degree label position — use dynamic position if computed, else default
        const precomputed = angleLabelPositions.get(index);
        const midAngle = useSmallArc
          ? startAngle + ccwSweep / 2
          : startAngle - (2 * Math.PI - ccwSweep) / 2;
        const labelR = precomputed?.radius ?? r + 12;
        const labelAngle = precomputed?.angle ?? midAngle;
        const labelX = sx + Math.cos(labelAngle) * labelR;
        const labelY = sy + Math.sin(labelAngle) * labelR;

        return (
          <g key={index}>
            <path
              d={arcPath}
              fill="none"
              stroke={colors.angle}
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
                    stroke={colors.angle}
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
                    stroke={colors.angle}
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
                fill={colors.angle}
                fontSize={Math.max(MIN_CANVAS_FONT_PX, 11) * fontScale}
                fontFamily="system-ui, sans-serif"
                textAnchor="middle"
                dominantBaseline="central"
                paintOrder="stroke"
                stroke="white"
                strokeWidth={3}
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
