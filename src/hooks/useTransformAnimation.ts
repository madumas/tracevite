/**
 * Shared hook for animated geometric transformations.
 * Manages requestAnimationFrame loop, ghost rendering, and deferred dispatch.
 */

import { useState, useCallback, useRef, useEffect, useMemo, createElement } from 'react';
import type { ViewportState } from '@/model/types';
import type { TransformAnimData } from '@/engine/transform-animation';
import { TRANSFORM_ANIMATION_MS, prefersReducedMotion } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_GUIDE } from '@/config/theme';

interface UseTransformAnimationOptions {
  viewport: ViewportState;
  animate: boolean; // preference toggle
  points: readonly { id: string; x: number; y: number }[];
  segments: readonly { id: string; startPointId: string; endPointId: string }[];
  circles: readonly { id: string; centerPointId: string; radiusMm: number }[];
}

interface TransformAnimationResult {
  /** Whether an animation is currently playing. */
  readonly isAnimating: boolean;
  /** Start an animation. Returns false if animation is disabled (dispatch immediately). */
  readonly startAnimation: (animData: TransformAnimData, onComplete: () => void) => boolean;
  /** Cancel animation in progress. */
  readonly cancelAnimation: () => void;
  /** SVG overlay elements for the animation (construction lines + ghost). */
  readonly animationOverlay: React.ReactNode;
}

export function useTransformAnimation({
  viewport,
  animate,
  points,
  segments,
  circles,
}: UseTransformAnimationOptions): TransformAnimationResult {
  const [animData, setAnimData] = useState<TransformAnimData | null>(null);
  const [animT, setAnimT] = useState(0);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const onCompleteRef = useRef<(() => void) | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelAnimation = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = null;
    setAnimData(null);
    setAnimT(0);
    onCompleteRef.current = null;
  }, []);

  const startAnimation = useCallback(
    (data: TransformAnimData, onComplete: () => void): boolean => {
      if (!animate || prefersReducedMotion()) return false;

      // Cancel any previous animation (I2: prevents double dispatch)
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

      setAnimData(data);
      setAnimT(0);
      onCompleteRef.current = onComplete;
      startTimeRef.current = performance.now();

      const step = (timestamp: number) => {
        const elapsed = timestamp - startTimeRef.current;
        const t = Math.min(elapsed / TRANSFORM_ANIMATION_MS, 1);
        // ease-out: t * (2 - t)
        const eased = t * (2 - t);
        setAnimT(eased);

        if (t < 1) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          frameRef.current = 0;
          onCompleteRef.current?.();
          // Keep overlay briefly visible, then clear (I3: timer stored in ref)
          clearTimerRef.current = setTimeout(() => {
            setAnimData(null);
            setAnimT(0);
            clearTimerRef.current = null;
          }, 100);
        }
      };

      frameRef.current = requestAnimationFrame(step);
      return true;
    },
    [animate],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  // Build point map for ghost rendering
  const pointMap = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);

  // Render construction lines + ghost
  const animationOverlay = useMemo(() => {
    if (!animData) return null;
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
    const elements: React.ReactNode[] = [];

    // Phase 1: construction lines (visible from t=0)
    const lineOpacity = Math.min(animT * 5, 0.4); // fade in over first 20%
    for (let i = 0; i < animData.constructionLines.length; i++) {
      const cl = animData.constructionLines[i]!;
      if (cl.type === 'line') {
        elements.push(
          createElement('line', {
            key: `cl-${i}`,
            x1: (cl.from.x - viewport.panX) * pxPerMm,
            y1: (cl.from.y - viewport.panY) * pxPerMm,
            x2: (cl.to.x - viewport.panX) * pxPerMm,
            y2: (cl.to.y - viewport.panY) * pxPerMm,
            stroke: CANVAS_GUIDE,
            strokeWidth: 1,
            strokeDasharray: '4 3',
            opacity: lineOpacity,
            pointerEvents: 'none',
          }),
        );
      } else if (cl.type === 'arc' && cl.center && cl.radius && cl.angleDeg) {
        const r = cl.radius * pxPerMm;
        const fx = (cl.from.x - viewport.panX) * pxPerMm;
        const fy = (cl.from.y - viewport.panY) * pxPerMm;
        const tx = (cl.to.x - viewport.panX) * pxPerMm;
        const ty = (cl.to.y - viewport.panY) * pxPerMm;
        const largeArc = Math.abs(cl.angleDeg) > 180 ? 1 : 0;
        const sweep = cl.angleDeg > 0 ? 1 : 0;
        elements.push(
          createElement('path', {
            key: `cl-arc-${i}`,
            d: `M ${fx} ${fy} A ${r} ${r} 0 ${largeArc} ${sweep} ${tx} ${ty}`,
            stroke: CANVAS_GUIDE,
            strokeWidth: 1,
            strokeDasharray: '4 3',
            opacity: lineOpacity,
            fill: 'none',
            pointerEvents: 'none',
          }),
        );
      }
    }

    // Phase 2: ghost segments at interpolated positions
    for (const seg of segments) {
      if (!animData.segmentIds.includes(seg.id)) continue;
      const p1 = animData.interpolatePosition(seg.startPointId, animT);
      const p2 = animData.interpolatePosition(seg.endPointId, animT);
      elements.push(
        createElement('line', {
          key: `ghost-seg-${seg.id}`,
          x1: (p1.x - viewport.panX) * pxPerMm,
          y1: (p1.y - viewport.panY) * pxPerMm,
          x2: (p2.x - viewport.panX) * pxPerMm,
          y2: (p2.y - viewport.panY) * pxPerMm,
          stroke: CANVAS_GUIDE,
          strokeWidth: 2,
          opacity: 0.5,
          pointerEvents: 'none',
        }),
      );
    }

    // Ghost points at interpolated positions
    for (const pid of animData.pointIds) {
      const pos = animData.interpolatePosition(pid, animT);
      elements.push(
        createElement('circle', {
          key: `ghost-pt-${pid}`,
          cx: (pos.x - viewport.panX) * pxPerMm,
          cy: (pos.y - viewport.panY) * pxPerMm,
          r: 4,
          fill: CANVAS_GUIDE,
          opacity: 0.4,
          pointerEvents: 'none',
        }),
      );
    }

    // Ghost circles at interpolated positions
    for (const circle of circles) {
      if (!animData.circleIds.includes(circle.id)) {
        // For non-scaled circles (rotation, translation), just move the center
        if (animData.pointIds.includes(circle.centerPointId)) {
          const pos = animData.interpolatePosition(circle.centerPointId, animT);
          const r = animData.interpolateRadius(circle.id, animT) || circle.radiusMm;
          elements.push(
            createElement('circle', {
              key: `ghost-circle-${circle.id}`,
              cx: (pos.x - viewport.panX) * pxPerMm,
              cy: (pos.y - viewport.panY) * pxPerMm,
              r: r * pxPerMm,
              fill: 'none',
              stroke: CANVAS_GUIDE,
              strokeWidth: 1.5,
              opacity: 0.4,
              pointerEvents: 'none',
            }),
          );
        }
      }
    }

    return elements;
  }, [animData, animT, viewport, pointMap, segments, circles]);

  return {
    isAnimating: animData !== null,
    startAnimation,
    cancelAnimation,
    animationOverlay,
  };
}
