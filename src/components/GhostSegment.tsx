import { memo } from 'react';
import type { ViewportState, DisplayUnit } from '@/model/types';
import {
  CANVAS_GHOST,
  CANVAS_GHOST_OPACITY,
  CANVAS_MEASUREMENT,
  CANVAS_GUIDE,
} from '@/config/theme';
import { MIN_CANVAS_FONT_PX } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { distance } from '@/engine/geometry';
import { formatLength } from '@/engine/format';

interface GhostSegmentProps {
  readonly startMm: { x: number; y: number };
  readonly endMm: { x: number; y: number };
  readonly viewport: ViewportState;
  readonly displayUnit: DisplayUnit;
  readonly isChaining: boolean;
  readonly guideType?: 'parallel' | 'perpendicular';
  readonly guideSegmentLabel?: string;
}

export const GhostSegment = memo(function GhostSegment({
  startMm,
  endMm,
  viewport,
  displayUnit,
  isChaining,
  guideType,
  guideSegmentLabel,
}: GhostSegmentProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const sx1 = (startMm.x - viewport.panX) * pxPerMm;
  const sy1 = (startMm.y - viewport.panY) * pxPerMm;
  const sx2 = (endMm.x - viewport.panX) * pxPerMm;
  const sy2 = (endMm.y - viewport.panY) * pxPerMm;

  const lengthMm = distance(startMm, endMm);
  const lengthText = formatLength(lengthMm, displayUnit);
  const opacity = isChaining ? 0.3 : CANVAS_GHOST_OPACITY;

  return (
    <g data-testid="ghost-segment">
      <line
        x1={sx1}
        y1={sy1}
        x2={sx2}
        y2={sy2}
        stroke={CANVAS_GHOST}
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={opacity}
      />
      {/* Length label near cursor (end point) */}
      <text
        x={sx2 + 10}
        y={sy2 - 10}
        fill={CANVAS_MEASUREMENT}
        fontSize={Math.max(MIN_CANVAS_FONT_PX, 13)}
        fontFamily="system-ui, sans-serif"
        opacity={0.8}
      >
        {lengthText}
      </text>
      {/* Guide line + label for parallel/perpendicular snap */}
      {guideType && (
        <>
          {/* Extended guide line through the segment direction */}
          <line
            x1={sx1 - (sx2 - sx1) * 2}
            y1={sy1 - (sy2 - sy1) * 2}
            x2={sx2 + (sx2 - sx1) * 2}
            y2={sy2 + (sy2 - sy1) * 2}
            stroke={CANVAS_GUIDE}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
          {/* Guide label badge — anchored near start point (stable, no flicker) */}
          {(() => {
            const label =
              guideType === 'parallel'
                ? `parallèle à ${guideSegmentLabel ?? ''}`
                : `⊥ à ${guideSegmentLabel ?? ''}`;
            return (
              <g>
                {/* Background pill for readability */}
                <rect
                  x={sx1 - 4}
                  y={sy1 - 32}
                  width={label.length * 7 + 8}
                  height={20}
                  rx={4}
                  fill="white"
                  stroke={CANVAS_GUIDE}
                  strokeWidth={1}
                  opacity={0.95}
                />
                <text
                  x={sx1}
                  y={sy1 - 18}
                  fill={CANVAS_GUIDE}
                  fontSize={13}
                  fontWeight={600}
                  fontFamily="system-ui, sans-serif"
                >
                  {label}
                </text>
              </g>
            );
          })()}
        </>
      )}
    </g>
  );
});
