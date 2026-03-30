import { useEffect, useRef, useState, useCallback } from 'react';
import type { ConstructionState } from '@/model/types';
import type { UndoManager } from '@/model/undo';
import { saveConstruction } from '@/model/persistence';
import { AUTO_SAVE_DEBOUNCE_MS } from '@/config/accessibility';

/**
 * Auto-save hook with 2s debounce.
 * Also saves immediately on beforeunload.
 */
export function useAutoSave(state: ConstructionState, undoManager: UndoManager) {
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const undoRef = useRef(undoManager);

  // Keep refs current
  stateRef.current = state;
  undoRef.current = undoManager;

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveConstruction(stateRef.current, undoRef.current);
    } catch {
      // Non-critical — app works without persistence
    }
    setSaving(false);
  }, []);

  // Debounced save on state change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSave();
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, doSave]);

  // Immediate save on beforeunload
  useEffect(() => {
    const handler = () => {
      // Synchronous save attempt via navigator.sendBeacon as fallback
      // For IndexedDB, we do a fire-and-forget save
      saveConstruction(stateRef.current, undoRef.current).catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return { saving };
}
