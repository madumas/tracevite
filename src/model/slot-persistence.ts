/**
 * Slot-aware IndexedDB persistence.
 * Each slot stores its construction data + undo history separately.
 * Migration from single-key format (Jalon A/B) to multi-slot.
 */

import { get, set, del } from 'idb-keyval';
import type { ConstructionState } from './types';
import type { UndoManager } from './undo';
import type { SlotRegistry } from './slots';
import { createEmptyRegistry, createSlot } from './slots';
import { serializeState, deserializeState } from './serialize';

// ── Keys ──────────────────────────────────────────────────

const REGISTRY_KEY = 'tracevite_registry';
const SLOT_DATA_PREFIX = 'tracevite_slot_';
const SLOT_UNDO_PREFIX = 'tracevite_undo_';

// Legacy single-key (Jalon A/B)
const LEGACY_CONSTRUCTION_KEY = 'tracevite_construction';
const LEGACY_UNDO_KEY = 'tracevite_undo';

// ── Registry operations ───────────────────────────────────

export async function loadRegistry(): Promise<SlotRegistry | null> {
  const result = await get<SlotRegistry>(REGISTRY_KEY);
  return result ?? null;
}

export async function saveRegistry(registry: SlotRegistry): Promise<void> {
  await set(REGISTRY_KEY, registry);
}

// ── Slot data operations ──────────────────────────────────

export async function saveSlotData(
  slotId: string,
  state: ConstructionState,
  undoManager: UndoManager,
): Promise<void> {
  const serialized = serializeState(state);
  const undoData = JSON.stringify({
    past: undoManager.past.map(serializeState),
    future: undoManager.future.map(serializeState),
  });

  await Promise.all([
    set(SLOT_DATA_PREFIX + slotId, serialized),
    set(SLOT_UNDO_PREFIX + slotId, undoData),
  ]);
}

export async function loadSlotData(
  slotId: string,
): Promise<{
  state: ConstructionState;
  past: ConstructionState[];
  future: ConstructionState[];
} | null> {
  try {
    const serialized = await get<string>(SLOT_DATA_PREFIX + slotId);
    if (!serialized) return null;

    const state = deserializeState(serialized);
    const undoData = await get<string>(SLOT_UNDO_PREFIX + slotId);
    let past: ConstructionState[] = [];
    let future: ConstructionState[] = [];

    if (undoData) {
      try {
        const parsed = JSON.parse(undoData) as { past: string[]; future: string[] };
        past = parsed.past.map(deserializeState);
        future = parsed.future.map(deserializeState);
      } catch {
        // Corrupted undo — start fresh
      }
    }

    return { state, past, future };
  } catch {
    return null;
  }
}

export async function deleteSlotData(slotId: string): Promise<void> {
  await Promise.all([del(SLOT_DATA_PREFIX + slotId), del(SLOT_UNDO_PREFIX + slotId)]);
}

// ── Migration ─────────────────────────────────────────────

/**
 * Migrate from legacy single-key format to multi-slot.
 * Idempotent — safe to call multiple times.
 * Must complete before React renders (D2).
 */
export async function migrateIfNeeded(): Promise<SlotRegistry> {
  // Check if registry already exists
  const existing = await loadRegistry();
  if (existing) return existing;

  // Check for legacy single-key data
  const legacyData = await get<string>(LEGACY_CONSTRUCTION_KEY);

  if (legacyData) {
    // Migrate: create registry with one slot containing the legacy data
    const registry = createEmptyRegistry();
    const result = createSlot(registry, 'Construction 1');
    if (!result) return createEmptyRegistry(); // Should never happen

    const { registry: newRegistry, slotId } = result;

    // Copy legacy data to slot key
    await set(SLOT_DATA_PREFIX + slotId, legacyData);
    const legacyUndo = await get<string>(LEGACY_UNDO_KEY);
    if (legacyUndo) {
      await set(SLOT_UNDO_PREFIX + slotId, legacyUndo);
    }

    // Save registry
    await saveRegistry(newRegistry);

    // Clean up legacy keys
    await Promise.all([del(LEGACY_CONSTRUCTION_KEY), del(LEGACY_UNDO_KEY)]);

    return newRegistry;
  }

  // First launch — empty registry
  const emptyRegistry = createEmptyRegistry();
  await saveRegistry(emptyRegistry);
  return emptyRegistry;
}
