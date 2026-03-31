/**
 * Cartesian coordinate plane overlay — spec §19 v2.
 * Renders X/Y axes with graduation and labels.
 * Mode 1quadrant: origin bottom-left, mode 4quadrants: origin center.
 */

import { memo } from 'react';
import type { ViewportState, CartesianMode } from '@/model/types';
import { useCanvasColors } from '@/config/theme';
import { CSS_PX_PER_MM, BOUNDS_WIDTH_MM, BOUNDS_HEIGHT_MM } from '@/engine/viewport';

interface CartesianLayerProps {
  readonly viewport: ViewportState;
  readonly mode: CartesianMode;
  readonly gridSizeMm: number;
}

export const CartesianLayer = memo(function CartesianLayer({
  viewport,
  mode,
  gridSizeMm,
}: CartesianLayerProps) {
  const colors = useCanvasColors();

  if (mode === 'off') return null;

  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

  // Origin position in mm
  const originX = mode === '1quadrant' ? 0 : BOUNDS_WIDTH_MM / 2;
  const originY = mode === '1quadrant' ? BOUNDS_HEIGHT_MM : BOUNDS_HEIGHT_MM / 2;

  // Convert to screen px
  const ox = (originX - viewport.panX) * pxPerMm;
  const oy = (originY - viewport.panY) * pxPerMm;

  // Axis endpoints (extend across full bounds)
  const xMin = (0 - viewport.panX) * pxPerMm;
  const xMax = (BOUNDS_WIDTH_MM - viewport.panX) * pxPerMm;
  const yMin = (0 - viewport.panY) * pxPerMm;
  const yMax = (BOUNDS_HEIGHT_MM - viewport.panY) * pxPerMm;

  const axisColor = colors.segment;
  const tickColor = colors.measurement;

  // Generate tick marks along X axis
  const ticks: React.ReactNode[] = [];
  const step = gridSizeMm;
  const tickLen = 3; // px

  // X axis ticks
  const mmStartX = mode === '1quadrant' ? 0 : -BOUNDS_WIDTH_MM / 2;
  const mmEndX = mode === '1quadrant' ? BOUNDS_WIDTH_MM : BOUNDS_WIDTH_MM / 2;
  for (let mm = step; mm <= mmEndX; mm += step) {
    const sx = (originX + mm - viewport.panX) * pxPerMm;
    ticks.push(
      <line
        key={`tx-${mm}`}
        x1={sx}
        y1={oy - tickLen}
        x2={sx}
        y2={oy + tickLen}
        stroke={axisColor}
        strokeWidth={0.5}
      />,
    );
    if (mm % (step * 2) === 0) {
      ticks.push(
        <text
          key={`lx-${mm}`}
          x={sx}
          y={oy + tickLen + 10}
          fill={tickColor}
          fontSize={9}
          textAnchor="middle"
        >
          {mm}
        </text>,
      );
    }
  }
  if (mode === '4quadrants') {
    for (let mm = -step; mm >= mmStartX; mm -= step) {
      const sx = (originX + mm - viewport.panX) * pxPerMm;
      ticks.push(
        <line
          key={`tx-${mm}`}
          x1={sx}
          y1={oy - tickLen}
          x2={sx}
          y2={oy + tickLen}
          stroke={axisColor}
          strokeWidth={0.5}
        />,
      );
      if (mm % (step * 2) === 0) {
        ticks.push(
          <text
            key={`lx-${mm}`}
            x={sx}
            y={oy + tickLen + 10}
            fill={tickColor}
            fontSize={9}
            textAnchor="middle"
          >
            {mm}
          </text>,
        );
      }
    }
  }

  // Y axis ticks (y-down in screen, but labels show positive upward)
  const mmStartY = mode === '1quadrant' ? 0 : -BOUNDS_HEIGHT_MM / 2;
  const mmEndY = mode === '1quadrant' ? BOUNDS_HEIGHT_MM : BOUNDS_HEIGHT_MM / 2;
  for (let mm = step; mm <= mmEndY; mm += step) {
    // In screen coords, positive Y is DOWN, but mathematically positive is UP
    const sy = (originY - mm - viewport.panY) * pxPerMm;
    ticks.push(
      <line
        key={`ty-${mm}`}
        x1={ox - tickLen}
        y1={sy}
        x2={ox + tickLen}
        y2={sy}
        stroke={axisColor}
        strokeWidth={0.5}
      />,
    );
    if (mm % (step * 2) === 0) {
      ticks.push(
        <text
          key={`ly-${mm}`}
          x={ox - tickLen - 4}
          y={sy + 3}
          fill={tickColor}
          fontSize={9}
          textAnchor="end"
        >
          {mm}
        </text>,
      );
    }
  }
  if (mode === '4quadrants') {
    for (let mm = -step; mm >= mmStartY; mm -= step) {
      const sy = (originY - mm - viewport.panY) * pxPerMm;
      ticks.push(
        <line
          key={`ty-${mm}`}
          x1={ox - tickLen}
          y1={sy}
          x2={ox + tickLen}
          y2={sy}
          stroke={axisColor}
          strokeWidth={0.5}
        />,
      );
      if (mm % (step * 2) === 0) {
        ticks.push(
          <text
            key={`ly-${mm}`}
            x={ox - tickLen - 4}
            y={sy + 3}
            fill={tickColor}
            fontSize={9}
            textAnchor="end"
          >
            {mm}
          </text>,
        );
      }
    }
  }

  return (
    <g data-testid="cartesian-layer" pointerEvents="none">
      {/* X axis */}
      <line x1={xMin} y1={oy} x2={xMax} y2={oy} stroke={axisColor} strokeWidth={1.5} />
      {/* Y axis */}
      <line x1={ox} y1={yMin} x2={ox} y2={yMax} stroke={axisColor} strokeWidth={1.5} />
      {/* Origin label */}
      <text x={ox - 6} y={oy + 12} fill={tickColor} fontSize={9} textAnchor="end">
        O
      </text>
      {/* Axis labels */}
      <text x={xMax - 10} y={oy - 6} fill={tickColor} fontSize={10} fontWeight={600}>
        x
      </text>
      <text x={ox + 6} y={yMin + 14} fill={tickColor} fontSize={10} fontWeight={600}>
        y
      </text>
      {ticks}
    </g>
  );
});
