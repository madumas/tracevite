import { memo } from 'react';
import type { Point, ViewportState } from '@/model/types';
import { useCanvasColors } from '@/config/theme';
import { POINT_DISPLAY_RADIUS_MM } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';

interface ChainingIndicatorProps {
  readonly point: Point;
  readonly viewport: ViewportState;
}

/**
 * Pulsing visual indicator on the chaining anchor point.
 * CSS animation for subtle pulse effect.
 */
export const ChainingIndicator = memo(function ChainingIndicator({
  point,
  viewport,
}: ChainingIndicatorProps) {
  const colors = useCanvasColors();
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const sx = (point.x - viewport.panX) * pxPerMm;
  const sy = (point.y - viewport.panY) * pxPerMm;
  const radiusPx = POINT_DISPLAY_RADIUS_MM * CSS_PX_PER_MM;

  return (
    <circle
      cx={sx}
      cy={sy}
      r={radiusPx * 1.5}
      fill="none"
      stroke={colors.point}
      strokeWidth={2}
      opacity={0.5}
      data-testid="chaining-indicator"
    >
      <animate
        attributeName="r"
        values={`${radiusPx * 1.2};${radiusPx * 2};${radiusPx * 1.2}`}
        dur="1.5s"
        repeatCount="indefinite"
      />
      <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.5s" repeatCount="indefinite" />
    </circle>
  );
});
