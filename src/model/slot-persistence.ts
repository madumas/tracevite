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

const REGISTRY_KEY = 'geomolo_registry';
const SLOT_DATA_PREFIX = 'geomolo_slot_';
const SLOT_UNDO_PREFIX = 'geomolo_undo_';

// localStorage mirror keys (same names — localStorage and IDB are separate namespaces)
const LS_REGISTRY_KEY = 'geomolo_registry';
const LS_SLOT_DATA_PREFIX = 'geomolo_slot_';

// Legacy keys from TraceVite branding
const LEGACY_REGISTRY_KEY = 'tracevite_registry';
const LEGACY_SLOT_DATA_PREFIX = 'tracevite_slot_';
const LEGACY_SLOT_UNDO_PREFIX = 'tracevite_undo_';

// Legacy single-key (Jalon A/B, pre-slot era)
const LEGACY_CONSTRUCTION_KEY = 'tracevite_construction';
const LEGACY_UNDO_KEY = 'tracevite_undo';

// ── localStorage helpers (silent fail) ───────────────────

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or unavailable — non-critical
  }
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // non-critical
  }
}

// ── Registry operations ───────────────────────────────────

export async function loadRegistry(): Promise<SlotRegistry | null> {
  let result =
    (await get<SlotRegistry>(REGISTRY_KEY)) ?? (await get<SlotRegistry>(LEGACY_REGISTRY_KEY));

  // Fallback: localStorage mirror (Firefox hard refresh can wipe IDB)
  if (!result) {
    const lsData = lsGet(LS_REGISTRY_KEY);
    if (lsData) {
      try {
        result = JSON.parse(lsData) as SlotRegistry;
        // Restore to IDB for future normal loads
        await set(REGISTRY_KEY, result);
      } catch {
        // Corrupted localStorage — ignore
      }
    }
  }

  return result ?? null;
}

export async function saveRegistry(registry: SlotRegistry): Promise<void> {
  await set(REGISTRY_KEY, registry);
  // Mirror to localStorage
  lsSet(LS_REGISTRY_KEY, JSON.stringify(registry));
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

  // Mirror construction data to localStorage (undo skipped — too large)
  lsSet(LS_SLOT_DATA_PREFIX + slotId, serialized);
}

/**
 * Synchronous localStorage-only save for beforeunload.
 * IDB writes are async and may not complete before page unloads.
 */
export function saveSlotDataSync(slotId: string, state: ConstructionState): void {
  const serialized = serializeState(state);
  lsSet(LS_SLOT_DATA_PREFIX + slotId, serialized);
}

export async function loadSlotData(slotId: string): Promise<{
  state: ConstructionState;
  past: ConstructionState[];
  future: ConstructionState[];
} | null> {
  try {
    let serialized =
      (await get<string>(SLOT_DATA_PREFIX + slotId)) ??
      (await get<string>(LEGACY_SLOT_DATA_PREFIX + slotId));

    // Fallback: localStorage mirror
    if (!serialized) {
      serialized = lsGet(LS_SLOT_DATA_PREFIX + slotId);
      if (serialized) {
        // Restore to IDB
        await set(SLOT_DATA_PREFIX + slotId, serialized);
      }
    }

    if (!serialized) return null;

    const state = deserializeState(serialized);
    const undoData =
      (await get<string>(SLOT_UNDO_PREFIX + slotId)) ??
      (await get<string>(LEGACY_SLOT_UNDO_PREFIX + slotId));
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
  await Promise.all([
    del(SLOT_DATA_PREFIX + slotId),
    del(SLOT_UNDO_PREFIX + slotId),
    del(LEGACY_SLOT_DATA_PREFIX + slotId),
    del(LEGACY_SLOT_UNDO_PREFIX + slotId),
  ]);
  lsRemove(LS_SLOT_DATA_PREFIX + slotId);
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
    const result = createSlot(registry); // auto-names to "Construction 1", increments nextNumber
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
