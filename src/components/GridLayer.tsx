import { memo } from 'react';
import type { ViewportState, GridSize } from '@/model/types';
import { CANVAS_GRID, CANVAS_GRID_OPACITY } from '@/config/theme';
import { BOUNDS_WIDTH_MM, BOUNDS_HEIGHT_MM, CSS_PX_PER_MM } from '@/engine/viewport';

interface GridLayerProps {
  readonly viewport: ViewportState;
  readonly gridSizeMm: GridSize;
}

/**
 * Renders grid lines in SVG.
 * Adaptive density: skip lines if < 10px apart, add sub-grid if > 60px apart.
 */
export const GridLayer = memo(function GridLayer({ viewport, gridSizeMm }: GridLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const gridPx = gridSizeMm * pxPerMm;

  // Adaptive density
  let effectiveGridMm = gridSizeMm;
  if (gridPx < 10) {
    // Too dense — double the spacing
    effectiveGridMm = (gridSizeMm * 2) as GridSize;
  }

  const showSubGrid = gridPx > 60;

  const lines: JSX.Element[] = [];

  // Vertical lines
  const startX = Math.floor(viewport.panX / effectiveGridMm) * effectiveGridMm;
  const endX = viewport.panX + BOUNDS_WIDTH_MM;
  for (let x = startX; x <= endX; x += effectiveGridMm) {
    const sx = (x - viewport.panX) * pxPerMm;
    lines.push(
      <line
        key={`v-${x}`}
        x1={sx}
        y1={0}
        x2={sx}
        y2={BOUNDS_HEIGHT_MM * pxPerMm}
        stroke={CANVAS_GRID}
        strokeWidth={1}
        opacity={CANVAS_GRID_OPACITY}
      />,
    );
  }

  // Horizontal lines
  const startY = Math.floor(viewport.panY / effectiveGridMm) * effectiveGridMm;
  const endY = viewport.panY + BOUNDS_HEIGHT_MM;
  for (let y = startY; y <= endY; y += effectiveGridMm) {
    const sy = (y - viewport.panY) * pxPerMm;
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={sy}
        x2={BOUNDS_WIDTH_MM * pxPerMm}
        y2={sy}
        stroke={CANVAS_GRID}
        strokeWidth={1}
        opacity={CANVAS_GRID_OPACITY}
      />,
    );
  }

  // Sub-grid (lighter)
  if (showSubGrid) {
    const subGridMm = effectiveGridMm / 2;
    const subStartX = Math.floor(viewport.panX / subGridMm) * subGridMm;
    for (let x = subStartX; x <= endX; x += subGridMm) {
      if (x % effectiveGridMm === 0) continue; // Skip main grid lines
      const sx = (x - viewport.panX) * pxPerMm;
      lines.push(
        <line
          key={`sv-${x}`}
          x1={sx}
          y1={0}
          x2={sx}
          y2={BOUNDS_HEIGHT_MM * pxPerMm}
          stroke={CANVAS_GRID}
          strokeWidth={0.5}
          opacity={CANVAS_GRID_OPACITY * 0.5}
        />,
      );
    }

    const subStartY = Math.floor(viewport.panY / subGridMm) * subGridMm;
    for (let y = subStartY; y <= endY; y += subGridMm) {
      if (y % effectiveGridMm === 0) continue;
      const sy = (y - viewport.panY) * pxPerMm;
      lines.push(
        <line
          key={`sh-${y}`}
          x1={0}
          y1={sy}
          x2={BOUNDS_WIDTH_MM * pxPerMm}
          y2={sy}
          stroke={CANVAS_GRID}
          strokeWidth={0.5}
          opacity={CANVAS_GRID_OPACITY * 0.5}
        />,
      );
    }
  }

  return <g data-testid="grid-layer">{lines}</g>;
});
