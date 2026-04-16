import { useEffect, useRef, useState, useCallback } from 'react';
import type { ConstructionState } from '@/model/types';
import type { UndoManager } from '@/model/undo';
import {
  saveSlotData,
  saveSlotDataSync,
  saveRegistry,
  loadRegistry,
} from '@/model/slot-persistence';
import { updateSlotMetadata } from '@/model/slots';
import { AUTO_SAVE_DEBOUNCE_MS } from '@/config/accessibility';
import { generateThumbnail } from '@/engine/thumbnail';

/**
 * Auto-save hook with 2s debounce — saves to active slot.
 * Also saves immediately on beforeunload.
 *
 * Hardening vs the original implementation:
 * - Debounce timer captures the scheduling snapshot (state, undoManager, slotId)
 *   so that a slot switch between t=0 and t=2s can't write the new slot's content
 *   into the old slot's IDB key.
 * - `slotId` is part of the effect deps: any switch re-schedules the timer cleanly.
 * - `cancelPendingSave` is exposed so `useSlotManager.switchSlot` can flush first.
 * - After the first successful save, we request persistent storage (iOS 7-day
 *   eviction mitigation) — outside any pointerdown handler to avoid surprising
 *   the child with a permission prompt.
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
  const persistRequestedRef = useRef(false);

  stateRef.current = state;
  undoRef.current = undoManager;
  slotIdRef.current = slotId;

  /** Persist the captured snapshot — scheduled snapshot prevents slot contamination. */
  const persistSnapshot = useCallback(
    async (capturedSlotId: string, capturedState: ConstructionState, capturedUndo: UndoManager) => {
      setSaving(true);
      try {
        await saveSlotData(capturedSlotId, capturedState, capturedUndo);

        // Update slot metadata (updatedAt + thumbnail) — load fresh registry
        // to merge with any concurrent registry updates.
        const thumbnail = generateThumbnail(capturedState);
        const registry = await loadRegistry();
        if (registry) {
          const updated = updateSlotMetadata(registry, capturedSlotId, {
            updatedAt: Date.now(),
            thumbnail,
          });
          await saveRegistry(updated);
        }

        // Request persistent storage once, after first successful save.
        if (!persistRequestedRef.current && typeof navigator !== 'undefined') {
          persistRequestedRef.current = true;
          try {
            await navigator.storage?.persist?.();
          } catch {
            // non-critical
          }
        }
      } catch {
        // Non-critical — app works without persistence
      }
      setSaving(false);
    },
    [],
  );

  const cancelPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Force an immediate save of the current state (used by switchSlot before loading next slot). */
  const flushNow = useCallback(async () => {
    cancelPendingSave();
    const sid = slotIdRef.current;
    if (!sid) return;
    await persistSnapshot(sid, stateRef.current, undoRef.current);
  }, [cancelPendingSave, persistSnapshot]);

  // Debounced save on state change. `slotId` is in deps so a switch clears any
  // pending timer that would otherwise fire with mixed-up refs.
  useEffect(() => {
    if (!slotId) return;
    cancelPendingSave();

    // Capture the snapshot at scheduling time — NOT at execution time.
    const capturedSlotId = slotId;
    const capturedState = state;
    const capturedUndo = undoManager;

    timerRef.current = setTimeout(() => {
      void persistSnapshot(capturedSlotId, capturedState, capturedUndo);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return cancelPendingSave;
  }, [state, undoManager, slotId, persistSnapshot, cancelPendingSave]);

  // Immediate save on beforeunload
  useEffect(() => {
    const handler = () => {
      const activeSlotId = slotIdRef.current;
      if (activeSlotId) {
        // Synchronous localStorage save (guaranteed to complete before unload).
        // Now includes a truncated undo history (1.9 fix).
        saveSlotDataSync(activeSlotId, stateRef.current, undoRef.current);
        // Also attempt async IDB save (may not complete)
        saveSlotData(activeSlotId, stateRef.current, undoRef.current).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return { saving, cancelPendingSave, flushNow };
}
