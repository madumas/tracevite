import { memo } from 'react';
import type { Point, Segment, ViewportState, DisplayUnit, DetectedProperty } from '@/model/types';
import {
  CANVAS_SEGMENT,
  CANVAS_MEASUREMENT,
  CANVAS_SELECTION_BG,
  CANVAS_GUIDE,
} from '@/config/theme';
import { MIN_CANVAS_FONT_PX, SEGMENT_HIT_ZONE_MM } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { formatLength } from '@/engine/format';

interface SegmentLayerProps {
  readonly segments: readonly Segment[];
  readonly points: readonly Point[];
  readonly viewport: ViewportState;
  readonly displayUnit: DisplayUnit;
  readonly selectedElementId: string | null;
  readonly properties: readonly DetectedProperty[];
  readonly hideProperties: boolean;
  readonly fontScale: number;
}

export const SegmentLayer = memo(function SegmentLayer({
  segments,
  points,
  viewport,
  displayUnit,
  selectedElementId,
  properties,
  hideProperties,
  fontScale,
}: SegmentLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const hitZonePx = SEGMENT_HIT_ZONE_MM * pxPerMm * 2;

  const pointMap = new Map(points.map((p) => [p.id, p]));

  // Build parallel pair colors: each pair of parallel segments gets a distinct color
  const PARALLEL_COLORS = ['#0B7285', '#C24B22', '#7C3AED', '#2E7D32'];
  const parallelSegColor = new Map<string, string>();
  if (!hideProperties) {
    // Group parallel segments into connected pairs
    const parallelGroups: string[][] = [];
    const segToParallelGroup = new Map<string, number>();
    for (const prop of properties) {
      if (prop.type === 'parallel') {
        const ids = [...prop.involvedIds];
        const existingIdx = ids
          .map((id) => segToParallelGroup.get(id))
          .find((g) => g !== undefined);
        if (existingIdx !== undefined) {
          for (const id of ids) {
            segToParallelGroup.set(id, existingIdx);
            if (!parallelGroups[existingIdx]!.includes(id)) parallelGroups[existingIdx]!.push(id);
          }
        } else {
          const idx = parallelGroups.length;
          parallelGroups.push(ids);
          for (const id of ids) segToParallelGroup.set(id, idx);
        }
      }
    }
    // Assign color per group
    for (let i = 0; i < parallelGroups.length; i++) {
      const color = PARALLEL_COLORS[i % PARALLEL_COLORS.length]!;
      for (const id of parallelGroups[i]!) {
        parallelSegColor.set(id, color);
      }
    }
  }

  // Build congruence groups: segments with equal lengths get tick marks (1, 2, 3...)
  const congruenceTickMap = new Map<string, number>();
  if (!hideProperties) {
    const equalGroups: string[][] = [];
    for (const prop of properties) {
      if (prop.type === 'equal_length') {
        equalGroups.push([...prop.involvedIds]);
      }
    }
    // Merge overlapping groups
    const segToGroup = new Map<string, number>();
    for (const group of equalGroups) {
      const existingGroupIdx = group.map((id) => segToGroup.get(id)).find((g) => g !== undefined);
      const groupIdx = existingGroupIdx ?? equalGroups.indexOf(group);
      for (const id of group) segToGroup.set(id, groupIdx);
    }
    // Assign tick counts per group
    const groupTicks = new Map<number, number>();
    let tickCounter = 1;
    for (const [segId, groupIdx] of segToGroup) {
      if (!groupTicks.has(groupIdx)) {
        groupTicks.set(groupIdx, tickCounter++);
      }
      congruenceTickMap.set(segId, groupTicks.get(groupIdx)!);
    }
  }

  return (
    <g data-testid="segment-layer">
      {segments.map((segment) => {
        const start = pointMap.get(segment.startPointId);
        const end = pointMap.get(segment.endPointId);
        if (!start || !end) return null;

        const sx1 = (start.x - viewport.panX) * pxPerMm;
        const sy1 = (start.y - viewport.panY) * pxPerMm;
        const sx2 = (end.x - viewport.panX) * pxPerMm;
        const sy2 = (end.y - viewport.panY) * pxPerMm;
        const midSx = (sx1 + sx2) / 2;
        const midSy = (sy1 + sy2) / 2;

        const isSelected = segment.id === selectedElementId;
        const lengthText = formatLength(segment.lengthMm, displayUnit);

        // Offset label perpendicular to segment
        const dx = sx2 - sx1;
        const dy = sy2 - sy1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const offsetX = len > 0 ? (-dy / len) * 14 : 0;
        const offsetY = len > 0 ? (dx / len) * 14 : -14;

        return (
          <g key={segment.id}>
            {/* Invisible hit zone for interaction */}
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke="transparent"
              strokeWidth={hitZonePx}
              data-element-id={segment.id}
            />
            {/* Selection highlight */}
            {isSelected && (
              <line
                x1={sx1}
                y1={sy1}
                x2={sx2}
                y2={sy2}
                stroke={CANVAS_SELECTION_BG}
                strokeWidth={6}
                strokeDasharray="4 2"
              />
            )}
            {/* Visible segment */}
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke={CANVAS_SEGMENT}
              strokeWidth={2}
              strokeLinecap="round"
              data-testid={`segment-${segment.id}`}
            />
            {/* Length label */}
            <text
              x={midSx + offsetX}
              y={midSy + offsetY}
              fill={CANVAS_MEASUREMENT}
              fontSize={Math.max(MIN_CANVAS_FONT_PX, 13) * fontScale}
              fontFamily="system-ui, sans-serif"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {lengthText}
            </text>
            {/* Parallel marks: // (two diagonal slashes) colored by pair */}
            {parallelSegColor.has(segment.id) && len > 0 && (
              <g>
                {[-3, 3].map((along) => {
                  const dirX = dx / len;
                  const dirY = dy / len;
                  // 45° diagonal relative to segment
                  const diagX = (dirX - dirY) * 0.7;
                  const diagY = (dirY + dirX) * 0.7;
                  const cx = midSx + dirX * along;
                  const cy = midSy + dirY * along;
                  const halfLen = 5;
                  return (
                    <line
                      key={along}
                      x1={cx - diagX * halfLen}
                      y1={cy - diagY * halfLen}
                      x2={cx + diagX * halfLen}
                      y2={cy + diagY * halfLen}
                      stroke={parallelSegColor.get(segment.id)!}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            )}
            {/* Congruence tick marks at midpoint */}
            {congruenceTickMap.has(segment.id) && len > 0 && (
              <g>
                {Array.from({ length: congruenceTickMap.get(segment.id)! }, (_, i) => {
                  const tickSpacing = 4;
                  const totalWidth = (congruenceTickMap.get(segment.id)! - 1) * tickSpacing;
                  const centerOffset = -totalWidth / 2 + i * tickSpacing;
                  const perpX = len > 0 ? (-dy / len) * 5 : 0;
                  const perpY = len > 0 ? (dx / len) * 5 : -5;
                  return (
                    <line
                      key={i}
                      x1={midSx + (dx / len) * centerOffset - perpX}
                      y1={midSy + (dy / len) * centerOffset - perpY}
                      x2={midSx + (dx / len) * centerOffset + perpX}
                      y2={midSy + (dy / len) * centerOffset + perpY}
                      stroke={CANVAS_GUIDE}
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});
