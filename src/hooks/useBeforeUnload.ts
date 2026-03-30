import { useEffect } from 'react';

/**
 * Shows browser confirmation dialog when canvas has elements.
 * Prevents accidental tab closure (Ctrl+W instead of Ctrl+Z).
 */
export function useBeforeUnload(hasElements: boolean) {
  useEffect(() => {
    if (!hasElements) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasElements]);
}
