import { memo } from 'react';
import type { Point, Segment, ViewportState, DisplayUnit, DetectedProperty } from '@/model/types';
import {
  CANVAS_SEGMENT,
  CANVAS_TRANSFORMED,
  CANVAS_TRANSFORM_PALETTE,
  CANVAS_TRANSFORM_DASHES,
  useCanvasColors,
} from '@/config/theme';
import { MIN_CANVAS_FONT_PX, SEGMENT_HIT_ZONE_MM, FOCUS_DIM_OPACITY } from '@/config/accessibility';
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
  readonly segmentColor?: string;
  readonly estimationMode?: boolean;
  readonly cluttered?: boolean;
  readonly hoveredElementId?: string | null;
  readonly focusDimmedIds?: ReadonlySet<string>;
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
  segmentColor = CANVAS_SEGMENT,
  estimationMode = false,
  cluttered = false,
  hoveredElementId = null,
  focusDimmedIds,
}: SegmentLayerProps) {
  const colors = useCanvasColors();
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const hitZonePx = SEGMENT_HIT_ZONE_MM * pxPerMm * 2;

  const pointMap = new Map(points.map((p) => [p.id, p]));

  // Build parallel pair colors: each pair of parallel segments gets a distinct color
  const PARALLEL_COLORS = ['#7A8B99', '#C24B22', '#7C3AED', '#2E7D32'];
  const parallelSegColor = new Map<string, string>();
  const parallelChevronCount = new Map<string, number>();
  const parallelGroups: string[][] = [];
  if (!hideProperties) {
    // Group parallel segments into connected pairs
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
    // Assign color and chevron count per group
    for (let i = 0; i < parallelGroups.length; i++) {
      const color = PARALLEL_COLORS[i % PARALLEL_COLORS.length]!;
      for (const id of parallelGroups[i]!) {
        parallelSegColor.set(id, color);
        parallelChevronCount.set(id, i + 1);
      }
    }
  }

  // Build parallel peer map for hover-reveal
  const parallelPeers = new Map<string, string[]>();
  if (cluttered) {
    for (const group of parallelGroups) {
      for (const segId of group) {
        parallelPeers.set(segId, group);
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

  // Build peer map for hover-reveal: hovering one segment reveals all congruent peers
  const congruencePeers = new Map<string, string[]>();
  if (cluttered) {
    const tickToSegs = new Map<number, string[]>();
    for (const [segId, ticks] of congruenceTickMap) {
      if (!tickToSegs.has(ticks)) tickToSegs.set(ticks, []);
      tickToSegs.get(ticks)!.push(segId);
    }
    for (const segs of tickToSegs.values()) {
      for (const segId of segs) {
        congruencePeers.set(segId, segs);
      }
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

        const isDimmed = focusDimmedIds?.has(segment.id) ?? false;

        return (
          <g key={segment.id} opacity={isDimmed ? FOCUS_DIM_OPACITY : 1}>
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
                stroke={colors.selectionBg}
                strokeWidth={6}
                strokeDasharray="4 2"
              />
            )}
            {/* Visible segment */}
            {(() => {
              let stroke = segmentColor;
              let dashArray: string | undefined;
              if (segment.isTransformed) {
                if (segment.transformGroupIndex != null) {
                  const idx = segment.transformGroupIndex % CANVAS_TRANSFORM_PALETTE.length;
                  stroke = CANVAS_TRANSFORM_PALETTE[idx]!;
                  dashArray = CANVAS_TRANSFORM_DASHES[idx];
                } else {
                  stroke = CANVAS_TRANSFORMED;
                }
              }
              return (
                <line
                  x1={sx1}
                  y1={sy1}
                  x2={sx2}
                  y2={sy2}
                  stroke={stroke}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={dashArray}
                  data-testid={`segment-${segment.id}`}
                />
              );
            })()}
            {/* Length label — hidden in estimation mode or when cluttered (unless selected) */}
            {!estimationMode && (!cluttered || segment.id === selectedElementId) && (
              <text
                x={midSx + offsetX}
                y={midSy + offsetY}
                fill={colors.measurement}
                fontSize={Math.max(MIN_CANVAS_FONT_PX, 13) * fontScale}
                fontFamily="system-ui, sans-serif"
                textAnchor="middle"
                dominantBaseline="central"
                paintOrder="stroke"
                stroke="white"
                strokeWidth={3}
              >
                {lengthText}
              </text>
            )}
            {/* When both parallel and congruence marks present, offset each ±8px from midpoint */}
            {(() => {
              const hasParallel = parallelSegColor.has(segment.id);
              const hasCong = congruenceTickMap.has(segment.id);
              const hasBoth = hasParallel && hasCong;
              const dirX = len > 0 ? dx / len : 0;
              const dirY = len > 0 ? dy / len : 0;
              const spread = hasBoth ? 8 : 0;
              const parCx = midSx - dirX * spread;
              const parCy = midSy - dirY * spread;
              const congCx = midSx + dirX * spread;
              const congCy = midSy + dirY * spread;
              return (
                <>
                  {/* Parallel chevrons (>, >>, >>>) — standard convention */}
                  {hasParallel &&
                    len > 0 &&
                    (!cluttered ||
                      isSelected ||
                      segment.id === hoveredElementId ||
                      parallelPeers.get(segment.id)?.includes(hoveredElementId ?? '') ||
                      parallelPeers.get(segment.id)?.includes(selectedElementId ?? '')) && (
                      <g>
                        {Array.from(
                          { length: cluttered ? 1 : (parallelChevronCount.get(segment.id) ?? 1) },
                          (_, i) => {
                            const perpX = -dy / len;
                            const perpY = dx / len;
                            const chevronSpacing = 6;
                            const count = parallelChevronCount.get(segment.id) ?? 1;
                            const totalW = (count - 1) * chevronSpacing;
                            const offset = -totalW / 2 + i * chevronSpacing;
                            const cx = parCx + dirX * offset;
                            const cy = parCy + dirY * offset;
                            const h = 4.5;
                            const w = 3;
                            return (
                              <polyline
                                key={i}
                                points={`${cx - dirX * w + perpX * h},${cy - dirY * w + perpY * h} ${cx},${cy} ${cx - dirX * w - perpX * h},${cy - dirY * w - perpY * h}`}
                                fill="none"
                                stroke={parallelSegColor.get(segment.id)!}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          },
                        )}
                      </g>
                    )}
                  {/* Congruence tick marks — standard convention */}
                  {hasCong &&
                    len > 0 &&
                    (!cluttered ||
                      isSelected ||
                      segment.id === hoveredElementId ||
                      congruencePeers.get(segment.id)?.includes(hoveredElementId ?? '') ||
                      congruencePeers.get(segment.id)?.includes(selectedElementId ?? '')) && (
                      <g>
                        {Array.from(
                          { length: cluttered ? 1 : congruenceTickMap.get(segment.id)! },
                          (_, i) => {
                            const tickCount = cluttered ? 1 : congruenceTickMap.get(segment.id)!;
                            const tickSpacing = 4;
                            const totalWidth = (tickCount - 1) * tickSpacing;
                            const centerOffset = -totalWidth / 2 + i * tickSpacing;
                            const perpX = len > 0 ? (-dy / len) * 6 : 0;
                            const perpY = len > 0 ? (dx / len) * 6 : -6;
                            return (
                              <line
                                key={i}
                                x1={congCx + dirX * centerOffset - perpX}
                                y1={congCy + dirY * centerOffset - perpY}
                                x2={congCx + dirX * centerOffset + perpX}
                                y2={congCy + dirY * centerOffset + perpY}
                                stroke={colors.guide}
                                strokeWidth={2.5}
                              />
                            );
                          },
                        )}
                      </g>
                    )}
                </>
              );
            })()}
          </g>
        );
      })}
    </g>
  );
});
