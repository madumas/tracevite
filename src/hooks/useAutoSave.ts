import { useEffect, useRef, useState, useCallback } from 'react';
import type { ConstructionState } from '@/model/types';
import type { UndoManager } from '@/model/undo';
import { saveSlotData, saveRegistry, loadRegistry } from '@/model/slot-persistence';
import { updateSlotMetadata } from '@/model/slots';
import { AUTO_SAVE_DEBOUNCE_MS } from '@/config/accessibility';

/**
 * Auto-save hook with 2s debounce — saves to active slot.
 * Also saves immediately on beforeunload.
 */
export function useAutoSave(
  state: ConstructionState,
  undoManager: UndoManager,
  slotId?: string | null,
) {
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const undoRef = useRef(undoManager);
  const slotIdRef = useRef(slotId);

  stateRef.current = state;
  undoRef.current = undoManager;
  slotIdRef.current = slotId;

  const doSave = useCallback(async () => {
    const activeSlotId = slotIdRef.current;
    if (!activeSlotId) return; // No active slot — nothing to save

    setSaving(true);
    try {
      await saveSlotData(activeSlotId, stateRef.current, undoRef.current);
      // Update slot metadata (updatedAt)
      const registry = await loadRegistry();
      if (registry) {
        const updated = updateSlotMetadata(registry, activeSlotId, { updatedAt: Date.now() });
        await saveRegistry(updated);
      }
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
      const activeSlotId = slotIdRef.current;
      if (activeSlotId) {
        saveSlotData(activeSlotId, stateRef.current, undoRef.current).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return { saving };
}
