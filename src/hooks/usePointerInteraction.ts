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
  cursorSmoothing?: boolean;
  /** Called during pinch-to-zoom/pan gesture with delta zoom and pan in mm. */
  onPinchZoom?: (deltaZoom: number, panDeltaMm: { x: number; y: number }) => void;
}

/**
 * Manages pointer events on the canvas SVG.
 * - Converts screen coords to mm
 * - Discriminates click vs drag via 1.5mm physical threshold
 * - Debounces clicks at 150ms
 * - pointerType discrimination: pen = tool immediately, touch = 80ms delay for pinch detection
 * - Multi-touch: 2 fingers = pinch-to-zoom + pan, >2 = ignore (palm rejection)
 */
const SMOOTHING_WINDOW = 5;
const TOUCH_DELAY_MS = 80;

interface PointerInfo {
  id: number;
  x: number;
  y: number;
}

export function usePointerInteraction({
  viewport,
  onCanvasClick,
  onCursorMove,
  cursorSmoothing = false,
  onPinchZoom,
}: UsePointerInteractionOptions) {
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const lastClickTime = useRef(0);
  const smoothingBuffer = useRef<{ x: number; y: number }[]>([]);

  // Multi-touch state
  const activePointers = useRef<Map<number, PointerInfo>>(new Map());
  const gestureMode = useRef<'idle' | 'pending_touch' | 'pinch'>('idle');
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTouchEvent = useRef<{ mmPos: { x: number; y: number } } | null>(null);
  const pinchStartDist = useRef(0);
  const pinchStartMid = useRef({ x: 0, y: 0 });

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

  const clearTouchTimer = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Track all pointers
      activePointers.current.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });

      // Pen (Apple Pencil) → always forward to tools immediately
      if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
        if (e.button !== 0) return;
        pointerDownPos.current = screenToMmPos(e);
        return;
      }

      // Touch: discriminate single tap vs pinch
      if (e.pointerType === 'touch') {
        const count = activePointers.current.size;

        if (count >= 3) {
          // Palm rejection: ignore 3+ simultaneous touches
          clearTouchTimer();
          gestureMode.current = 'idle';
          pendingTouchEvent.current = null;
          return;
        }

        if (count === 2) {
          // Second finger → enter pinch mode, cancel pending tool click
          clearTouchTimer();
          gestureMode.current = 'pinch';
          pendingTouchEvent.current = null;
          pointerDownPos.current = null;

          // Store initial pinch state
          const ptrs = Array.from(activePointers.current.values());
          const dx = ptrs[1]!.x - ptrs[0]!.x;
          const dy = ptrs[1]!.y - ptrs[0]!.y;
          pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
          pinchStartMid.current = {
            x: (ptrs[0]!.x + ptrs[1]!.x) / 2,
            y: (ptrs[0]!.y + ptrs[1]!.y) / 2,
          };
          return;
        }

        // Single finger: start 80ms timer, forward to tool if no second finger arrives
        const mmPos = screenToMmPos(e);
        pendingTouchEvent.current = { mmPos };
        pointerDownPos.current = mmPos;
        gestureMode.current = 'pending_touch';

        clearTouchTimer();
        touchTimerRef.current = setTimeout(() => {
          // Timer expired with single finger → treat as tool interaction
          gestureMode.current = 'idle';
          pendingTouchEvent.current = null;
        }, TOUCH_DELAY_MS);
      }
    },
    [screenToMmPos, clearTouchTimer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Update tracked pointer position
      if (activePointers.current.has(e.pointerId)) {
        activePointers.current.set(e.pointerId, {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
        });
      }

      // Pinch mode: compute zoom + pan delta
      if (gestureMode.current === 'pinch' && activePointers.current.size === 2 && onPinchZoom) {
        const ptrs = Array.from(activePointers.current.values());
        const dx = ptrs[1]!.x - ptrs[0]!.x;
        const dy = ptrs[1]!.y - ptrs[0]!.y;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        const currentMid = {
          x: (ptrs[0]!.x + ptrs[1]!.x) / 2,
          y: (ptrs[0]!.y + ptrs[1]!.y) / 2,
        };

        // Zoom: ratio of distances
        const zoomDelta =
          pinchStartDist.current > 0 ? (currentDist / pinchStartDist.current - 1) * 0.5 : 0;

        // Pan: midpoint movement in mm
        const panDeltaPx = {
          x: currentMid.x - pinchStartMid.current.x,
          y: currentMid.y - pinchStartMid.current.y,
        };
        const panDeltaMm = {
          x: -panDeltaPx.x / (viewport.zoom * CSS_PX_PER_MM),
          y: -panDeltaPx.y / (viewport.zoom * CSS_PX_PER_MM),
        };

        onPinchZoom(zoomDelta, panDeltaMm);

        // Update baseline for next frame
        pinchStartDist.current = currentDist;
        pinchStartMid.current = currentMid;
        return;
      }

      // During pending touch delay, don't forward cursor move to tool
      if (gestureMode.current === 'pending_touch') return;

      // Normal move: forward to tool
      const mmPos = screenToMmPos(e);
      if (cursorSmoothing) {
        const buf = smoothingBuffer.current;
        buf.push(mmPos);
        if (buf.length > SMOOTHING_WINDOW) buf.shift();
        const avgX = buf.reduce((s, p) => s + p.x, 0) / buf.length;
        const avgY = buf.reduce((s, p) => s + p.y, 0) / buf.length;
        onCursorMove({ x: avgX, y: avgY });
      } else {
        smoothingBuffer.current = [];
        onCursorMove(mmPos);
      }
    },
    [screenToMmPos, onCursorMove, cursorSmoothing, viewport.zoom, onPinchZoom],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      activePointers.current.delete(e.pointerId);

      // If ending pinch, reset gesture mode
      if (gestureMode.current === 'pinch') {
        if (activePointers.current.size === 0) {
          gestureMode.current = 'idle';
        }
        return;
      }

      // If pending touch was cancelled by pinch, ignore
      if (gestureMode.current === 'pending_touch') {
        clearTouchTimer();
        gestureMode.current = 'idle';
        // Still process as click if no second finger arrived
      }

      if (e.button !== 0 && e.pointerType !== 'touch') return;
      const downPos = pointerDownPos.current;
      pointerDownPos.current = null;
      if (!downPos) return;

      const upPos = screenToMmPos(e);

      // Drag threshold
      const moved = distance(downPos, upPos);
      if (moved > DRAG_THRESHOLD_MM) return;

      // Click debounce
      const now = Date.now();
      if (now - lastClickTime.current < CLICK_DEBOUNCE_MS) return;
      lastClickTime.current = now;

      onCanvasClick(upPos);
    },
    [screenToMmPos, onCanvasClick, clearTouchTimer],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
