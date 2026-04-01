/**
 * Print guide: subtle dashed rectangle showing the printable area on canvas.
 * Helps the child size and position their construction to fit the printed page.
 */

import { memo } from 'react';
import type { ViewportState } from '@/model/types';
import type { PageFormat } from '@/model/preferences';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { MARGIN_MM, getPrintableArea } from '@/engine/print-shared';

interface PrintGuideLayerProps {
  readonly viewport: ViewportState;
  readonly pageFormat: PageFormat;
  readonly landscape: boolean;
}

export const PrintGuideLayer = memo(function PrintGuideLayer({
  viewport,
  pageFormat,
  landscape,
}: PrintGuideLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const area = getPrintableArea(pageFormat, landscape);

  // Guide positioned at top-left of canvas, offset by margin
  const originX = MARGIN_MM;
  const originY = MARGIN_MM;

  const x = (originX - viewport.panX) * pxPerMm;
  const y = (originY - viewport.panY) * pxPerMm;
  const width = area.width * pxPerMm;
  const height = area.height * pxPerMm;

  return (
    <g data-testid="print-guide-layer" pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="#C8D1DA"
        strokeWidth={1}
        strokeDasharray="8 4"
        opacity={0.7}
      />
    </g>
  );
});
