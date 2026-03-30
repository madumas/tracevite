import { memo } from 'react';
import type { SnapResult, ViewportState } from '@/model/types';
import { CANVAS_POINT, CANVAS_GUIDE } from '@/config/theme';
import { CSS_PX_PER_MM } from '@/engine/viewport';

interface SnapFeedbackProps {
  readonly snapResult: SnapResult | null;
  readonly viewport: ViewportState;
}

export const SnapFeedback = memo(function SnapFeedback({
  snapResult,
  viewport,
}: SnapFeedbackProps) {
  if (!snapResult || snapResult.snapType === 'none') return null;

  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const sx = (snapResult.snappedPosition.x - viewport.panX) * pxPerMm;
  const sy = (snapResult.snappedPosition.y - viewport.panY) * pxPerMm;

  if (snapResult.snapType === 'point') {
    // Halo around snapped point
    return (
      <circle
        cx={sx}
        cy={sy}
        r={12}
        fill="none"
        stroke={CANVAS_POINT}
        strokeWidth={2}
        opacity={0.4}
        data-testid="snap-point-halo"
      />
    );
  }

  if (snapResult.snapType === 'grid') {
    // Small dot at grid intersection
    return (
      <circle cx={sx} cy={sy} r={4} fill={CANVAS_GUIDE} opacity={0.6} data-testid="snap-grid-dot" />
    );
  }

  return null;
});
