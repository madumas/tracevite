/**
 * Slot lifecycle management hook.
 * Coordinates auto-save, slot switching, creation, deletion.
 */

import { useState, useCallback } from 'react';
import type { ConstructionState } from '@/model/types';
import type { UndoManager } from '@/model/undo';
import type { ConstructionAction } from '@/model/reducer';
import type { SlotRegistry } from '@/model/slots';
import { createSlot, renameSlot, deleteSlot, setActiveSlot, canCreateSlot } from '@/model/slots';
import { saveSlotData, loadSlotData, saveRegistry, deleteSlotData } from '@/model/slot-persistence';

interface UseSlotManagerOptions {
  initialRegistry: SlotRegistry;
  state: ConstructionState;
  undoManager: UndoManager;
  dispatch: (action: ConstructionAction) => void;
  onBeforeSwitch: () => void; // tool.reset() + selection.clearSelection()
}

export function useSlotManager({
  initialRegistry,
  state,
  undoManager,
  dispatch,
  onBeforeSwitch,
}: UseSlotManagerOptions) {
  const [registry, setRegistry] = useState<SlotRegistry>(initialRegistry);

  const activeSlotId = registry.activeSlotId;

  const switchSlot = useCallback(
    async (targetSlotId: string) => {
      if (targetSlotId === activeSlotId) return;

      // 1. Auto-save current slot
      if (activeSlotId) {
        await saveSlotData(activeSlotId, state, undoManager);
      }

      // 2. Load target slot
      const slotData = await loadSlotData(targetSlotId);

      // 3. Reset tool state (D3)
      onBeforeSwitch();

      // 4. Dispatch loaded state
      if (slotData) {
        dispatch({
          type: 'LOAD_CONSTRUCTION',
          undoManager: {
            past: slotData.past,
            current: slotData.state,
            future: slotData.future,
          },
        });
      } else {
        dispatch({ type: 'NEW_CONSTRUCTION' });
      }

      // 5. Update registry
      const newRegistry = setActiveSlot(registry, targetSlotId);
      setRegistry(newRegistry);
      await saveRegistry(newRegistry);
    },
    [activeSlotId, state, undoManager, dispatch, onBeforeSwitch, registry],
  );

  const createNewSlot = useCallback(
    async (name?: string) => {
      if (!canCreateSlot(registry)) return;

      // Auto-save current
      if (activeSlotId) {
        await saveSlotData(activeSlotId, state, undoManager);
      }

      // Create slot
      const result = createSlot(registry, name);
      if (!result) return;

      // Reset to empty construction
      onBeforeSwitch();
      dispatch({ type: 'NEW_CONSTRUCTION' });

      setRegistry(result.registry);
      await saveRegistry(result.registry);
    },
    [registry, activeSlotId, state, undoManager, dispatch, onBeforeSwitch],
  );

  const removeSlot = useCallback(
    async (slotId: string) => {
      await deleteSlotData(slotId);
      let newRegistry = deleteSlot(registry, slotId);

      // If deleted the active slot, switch to another or create new
      if (slotId === activeSlotId) {
        if (newRegistry.slots.length > 0) {
          const firstSlot = newRegistry.slots[0]!;
          newRegistry = setActiveSlot(newRegistry, firstSlot.id);

          const slotData = await loadSlotData(firstSlot.id);
          onBeforeSwitch();
          if (slotData) {
            dispatch({
              type: 'LOAD_CONSTRUCTION',
              undoManager: {
                past: slotData.past,
                current: slotData.state,
                future: slotData.future,
              },
            });
          } else {
            dispatch({ type: 'NEW_CONSTRUCTION' });
          }
        } else {
          // No slots left — create a new one
          const result = createSlot(newRegistry);
          if (result) {
            newRegistry = result.registry;
            onBeforeSwitch();
            dispatch({ type: 'NEW_CONSTRUCTION' });
          }
        }
      }

      setRegistry(newRegistry);
      await saveRegistry(newRegistry);
    },
    [registry, activeSlotId, dispatch, onBeforeSwitch],
  );

  const renameCurrentSlot = useCallback(
    async (slotId: string, name: string) => {
      const newRegistry = renameSlot(registry, slotId, name);
      setRegistry(newRegistry);
      await saveRegistry(newRegistry);
    },
    [registry],
  );

  return {
    registry,
    activeSlotId,
    switchSlot,
    createNewSlot,
    removeSlot,
    renameCurrentSlot,
  };
}
