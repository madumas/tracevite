import { memo } from 'react';
import type { ViewportState, GridSize } from '@/model/types';
import type { PageFormat } from '@/model/preferences';
import { useCanvasColors } from '@/config/theme';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { MARGIN_MM, getPrintableArea } from '@/engine/print-shared';

interface GridLayerProps {
  readonly viewport: ViewportState;
  readonly gridSizeMm: GridSize;
  readonly pageFormat?: PageFormat;
  readonly landscape?: boolean;
  readonly reinforced?: boolean;
}

/**
 * Renders grid lines in SVG.
 * Adaptive density: skip lines if < 10px apart, add sub-grid if > 60px apart.
 */
export const GridLayer = memo(function GridLayer({
  viewport,
  gridSizeMm,
  pageFormat = 'letter',
  landscape = true,
  reinforced = false,
}: GridLayerProps) {
  const colors = useCanvasColors();
  const gridOpacity = reinforced ? Math.min(colors.gridOpacity * 1.6, 0.85) : colors.gridOpacity;
  const gridStrokeWidth = reinforced ? 1.5 : 1;
  const subGridStrokeWidth = reinforced ? 0.8 : 0.5;
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const gridPx = gridSizeMm * pxPerMm;

  // Grid covers the printable area (page minus margins)
  const area = getPrintableArea(pageFormat, landscape);
  const gridOriginX = MARGIN_MM;
  const gridOriginY = MARGIN_MM;
  const gridEndX = gridOriginX + area.width;
  const gridEndY = gridOriginY + area.height;

  // Adaptive density
  let effectiveGridMm = gridSizeMm;
  if (gridPx < 10) {
    effectiveGridMm = (gridSizeMm * 2) as GridSize;
  }

  const showSubGrid = gridPx > 60;

  const lines: JSX.Element[] = [];

  // Screen coords for grid bounds
  const gx1 = (gridOriginX - viewport.panX) * pxPerMm;
  const gy1 = (gridOriginY - viewport.panY) * pxPerMm;
  const gx2 = (gridEndX - viewport.panX) * pxPerMm;
  const gy2 = (gridEndY - viewport.panY) * pxPerMm;

  // Vertical lines (within printable area)
  const startX = Math.ceil(gridOriginX / effectiveGridMm) * effectiveGridMm;
  for (let x = startX; x <= gridEndX; x += effectiveGridMm) {
    const sx = (x - viewport.panX) * pxPerMm;
    lines.push(
      <line
        key={`v-${x}`}
        x1={sx}
        y1={gy1}
        x2={sx}
        y2={gy2}
        stroke={colors.grid}
        strokeWidth={gridStrokeWidth}
        opacity={gridOpacity}
      />,
    );
  }

  // Horizontal lines (within printable area)
  const startY = Math.ceil(gridOriginY / effectiveGridMm) * effectiveGridMm;
  for (let y = startY; y <= gridEndY; y += effectiveGridMm) {
    const sy = (y - viewport.panY) * pxPerMm;
    lines.push(
      <line
        key={`h-${y}`}
        x1={gx1}
        y1={sy}
        x2={gx2}
        y2={sy}
        stroke={colors.grid}
        strokeWidth={gridStrokeWidth}
        opacity={gridOpacity}
      />,
    );
  }

  // Sub-grid (lighter)
  if (showSubGrid) {
    const subGridMm = effectiveGridMm / 2;
    const subStartX = Math.ceil(gridOriginX / subGridMm) * subGridMm;
    for (let x = subStartX; x <= gridEndX; x += subGridMm) {
      if (x % effectiveGridMm === 0) continue;
      const sx = (x - viewport.panX) * pxPerMm;
      lines.push(
        <line
          key={`sv-${x}`}
          x1={sx}
          y1={gy1}
          x2={sx}
          y2={gy2}
          stroke={colors.grid}
          strokeWidth={subGridStrokeWidth}
          opacity={gridOpacity * 0.5}
        />,
      );
    }

    const subStartY = Math.ceil(gridOriginY / subGridMm) * subGridMm;
    for (let y = subStartY; y <= gridEndY; y += subGridMm) {
      if (y % effectiveGridMm === 0) continue;
      const sy = (y - viewport.panY) * pxPerMm;
      lines.push(
        <line
          key={`sh-${y}`}
          x1={gx1}
          y1={sy}
          x2={gx2}
          y2={sy}
          stroke={colors.grid}
          strokeWidth={subGridStrokeWidth}
          opacity={gridOpacity * 0.5}
        />,
      );
    }
  }

  return <g data-testid="grid-layer">{lines}</g>;
});
