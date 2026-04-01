import { useState, useCallback, useEffect, useRef } from 'react';
import type { ViewportState } from '@/model/types';
import { computeInitialZoom, clampViewport, clampZoom, CSS_PX_PER_MM } from '@/engine/viewport';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const ZOOM_STEP = 0.1;
const PAN_STEP_MM = 10;

export function useViewport(
  containerRef: React.RefObject<HTMLElement | null>,
  containerSize: { width: number; height: number },
) {
  const [viewport, setViewport] = useState<ViewportState>({ panX: 0, panY: 0, zoom: 1.0 });
  const initializedRef = useRef(false);
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const orientationRef = useRef(isPortrait);

  // Effect 1: Initialize zoom on mount (once, when container size is known)
  useEffect(() => {
    if (initializedRef.current || containerSize.width === 0) return;
    initializedRef.current = true;
    const zoom = computeInitialZoom(containerSize.width, containerSize.height);
    setViewport(clampViewport({ panX: 0, panY: 0, zoom }));
  }, [containerSize.width, containerSize.height]);

  // Effect 2: Recalculate zoom on orientation change
  useEffect(() => {
    if (!initializedRef.current) return;
    if (isPortrait === orientationRef.current) return;
    orientationRef.current = isPortrait;
    const el = containerRef.current;
    if (!el) return;
    const zoom = computeInitialZoom(el.clientWidth, el.clientHeight);
    setViewport(clampViewport({ panX: 0, panY: 0, zoom }));
  }, [isPortrait, containerRef]);

  const zoomIn = useCallback(() => {
    setViewport((v) => clampViewport({ ...v, zoom: clampZoom(v.zoom + ZOOM_STEP) }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport((v) => clampViewport({ ...v, zoom: clampZoom(v.zoom - ZOOM_STEP) }));
  }, []);

  const panUp = useCallback(() => {
    setViewport((v) => clampViewport({ ...v, panY: v.panY - PAN_STEP_MM }));
  }, []);

  const panDown = useCallback(() => {
    setViewport((v) => clampViewport({ ...v, panY: v.panY + PAN_STEP_MM }));
  }, []);

  const panLeft = useCallback(() => {
    setViewport((v) => clampViewport({ ...v, panX: v.panX - PAN_STEP_MM }));
  }, []);

  const panRight = useCallback(() => {
    setViewport((v) => clampViewport({ ...v, panX: v.panX + PAN_STEP_MM }));
  }, []);

  const resetZoom = useCallback(() => {
    setViewport((v) => clampViewport({ ...v, zoom: 1.0 }));
  }, []);

  // Pinch-to-zoom + two-finger pan (touch gestures)
  const pinchZoomPan = useCallback((deltaZoom: number, panDeltaMm: { x: number; y: number }) => {
    setViewport((v) =>
      clampViewport({
        panX: v.panX + panDeltaMm.x,
        panY: v.panY + panDeltaMm.y,
        zoom: clampZoom(v.zoom * (1 + deltaZoom)), // multiplicative zoom (I4 fix)
      }),
    );
  }, []);

  // Wheel zoom (without Ctrl — Ctrl+wheel = browser zoom per spec §21.1)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) return; // Let browser handle
    e.preventDefault();

    if (e.shiftKey) {
      // Horizontal scroll
      setViewport((v) => clampViewport({ ...v, panX: v.panX + e.deltaY / CSS_PX_PER_MM }));
    } else {
      // Zoom
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setViewport((v) => clampViewport({ ...v, zoom: clampZoom(v.zoom + delta) }));
    }
  }, []);

  // Attach wheel listener (needs { passive: false } to preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef, handleWheel]);

  return {
    viewport,
    zoomIn,
    zoomOut,
    panUp,
    panDown,
    panLeft,
    panRight,
    resetZoom,
    pinchZoomPan,
  };
}
