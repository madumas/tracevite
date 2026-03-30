import { useCallback, useRef } from 'react';
import type { ViewportState } from '@/model/types';
import { screenToMm, CSS_PX_PER_MM } from '@/engine/viewport';
import { distance } from '@/engine/geometry';
import { DRAG_THRESHOLD_MM, CLICK_DEBOUNCE_MS } from '@/config/accessibility';

export interface PointerState {
  /** Current cursor position in mm. */
  cursorMm: { x: number; y: number } | null;
}

interface UsePointerInteractionOptions {
  viewport: ViewportState;
  onCanvasClick: (mmPos: { x: number; y: number }) => void;
  onCursorMove: (mmPos: { x: number; y: number }) => void;
}

/**
 * Manages pointer events on the canvas SVG.
 * - Converts screen coords to mm
 * - Discriminates click vs drag via 1.5mm physical threshold
 * - Debounces clicks at 150ms
 */
export function usePointerInteraction({
  viewport,
  onCanvasClick,
  onCursorMove,
}: UsePointerInteractionOptions) {
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const lastClickTime = useRef(0);

  const screenToMmPos = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      return screenToMm(sx, sy, viewport, CSS_PX_PER_MM);
    },
    [viewport],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return; // Left button only
      pointerDownPos.current = screenToMmPos(e);
    },
    [screenToMmPos],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const mmPos = screenToMmPos(e);
      onCursorMove(mmPos);
    },
    [screenToMmPos, onCursorMove],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const downPos = pointerDownPos.current;
      pointerDownPos.current = null;
      if (!downPos) return;

      const upPos = screenToMmPos(e);

      // Drag threshold: if movement > 1.5mm, it's a drag, not a click
      const moved = distance(downPos, upPos);
      if (moved > DRAG_THRESHOLD_MM) return; // Drag — handled by move tool later

      // Click debounce
      const now = Date.now();
      if (now - lastClickTime.current < CLICK_DEBOUNCE_MS) return;
      lastClickTime.current = now;

      onCanvasClick(upPos);
    },
    [screenToMmPos, onCanvasClick],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
