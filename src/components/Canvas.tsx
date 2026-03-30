import { useRef } from 'react';
import type { ConstructionState, ViewportState } from '@/model/types';
import { CANVAS_BG } from '@/config/theme';
import { BOUNDS_WIDTH_MM, BOUNDS_HEIGHT_MM, CSS_PX_PER_MM } from '@/engine/viewport';
import { GridLayer } from './GridLayer';
import { PointLayer } from './PointLayer';
import { SegmentLayer } from './SegmentLayer';
import { NavigationControls } from './NavigationControls';
import { useViewport } from '@/hooks/useViewport';

interface CanvasProps {
  readonly state: ConstructionState;
  /** Optional pointer event handler for tool interactions. */
  readonly onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
  readonly onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void;
  readonly onPointerUp?: (e: React.PointerEvent<SVGSVGElement>) => void;
  /** Optional extra SVG content (ghost segment, snap feedback, etc.) */
  readonly children?: React.ReactNode;
}

export function Canvas({
  state,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  children,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, zoomIn, zoomOut, panUp, panDown, panLeft, panRight } =
    useViewport(containerRef);

  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const svgWidth = BOUNDS_WIDTH_MM * pxPerMm;
  const svgHeight = BOUNDS_HEIGHT_MM * pxPerMm;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'auto',
        background: CANVAS_BG,
      }}
      data-testid="canvas-container"
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="application"
        aria-label="Canevas de construction géométrique"
        style={{ display: 'block', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        data-testid="canvas-svg"
      >
        <GridLayer viewport={viewport} gridSizeMm={state.gridSizeMm} />
        <SegmentLayer
          segments={state.segments}
          points={state.points}
          viewport={viewport}
          displayUnit={state.displayUnit}
          selectedElementId={state.selectedElementId}
        />
        <PointLayer
          points={state.points}
          viewport={viewport}
          selectedElementId={state.selectedElementId}
        />
        {children}
      </svg>
      <NavigationControls
        onPanUp={panUp}
        onPanDown={panDown}
        onPanLeft={panLeft}
        onPanRight={panRight}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />
    </div>
  );
}

/** Re-export viewport for consumers that need coordinate conversion. */
export type { ViewportState };
