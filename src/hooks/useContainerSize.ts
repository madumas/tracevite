import { useState, useLayoutEffect, useRef } from 'react';

/**
 * Observe an element's size via ResizeObserver.
 * Returns reactive { width, height } in CSS pixels.
 */
export function useContainerSize(ref: React.RefObject<HTMLElement | null>): {
  width: number;
  height: number;
} {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const prevRef = useRef({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Read initial size synchronously
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w !== prevRef.current.width || h !== prevRef.current.height) {
      prevRef.current = { width: w, height: h };
      setSize({ width: w, height: h });
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // contentRect for Safari < 15.4 compat
      const nw = Math.round(entry.contentRect.width);
      const nh = Math.round(entry.contentRect.height);
      if (nw !== prevRef.current.width || nh !== prevRef.current.height) {
        prevRef.current = { width: nw, height: nh };
        setSize({ width: nw, height: nh });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
