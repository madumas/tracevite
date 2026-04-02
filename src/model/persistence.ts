/**
 * IndexedDB persistence via idb-keyval.
 * Auto-save with 2s debounce. Immediate save on beforeunload.
 */

import { get, set } from 'idb-keyval';
import type { ConstructionState } from './types';
import type { UndoManager } from './undo';
import { serializeState, deserializeState } from './serialize';

// ── Keys ──────────────────────────────────────────────────

const CONSTRUCTION_KEY = 'geomolo_construction';
const UNDO_KEY = 'geomolo_undo';
const LAUNCHED_FLAG_IDB = 'geomolo_launched';
const LAUNCHED_FLAG_LS = 'geomolo_launched';

// Legacy keys for migration from TraceVite
const LEGACY_CONSTRUCTION_KEY = 'tracevite_construction';
const LEGACY_UNDO_KEY = 'tracevite_undo';
const LEGACY_LAUNCHED_FLAG_IDB = 'tracevite_launched';
const LEGACY_LAUNCHED_FLAG_LS = 'tracevite_launched';

// ── Save / Load ───────────────────────────────────────────

export async function saveConstruction(
  state: ConstructionState,
  undoManager: UndoManager,
): Promise<void> {
  const serialized = serializeState(state);
  const undoData = JSON.stringify({
    past: undoManager.past.map(serializeState),
    future: undoManager.future.map(serializeState),
  });

  await Promise.all([
    set(CONSTRUCTION_KEY, serialized),
    set(UNDO_KEY, undoData),
    set(LAUNCHED_FLAG_IDB, true),
  ]);

  // Redundant flag in localStorage (Deep Freeze detection)
  try {
    localStorage.setItem(LAUNCHED_FLAG_LS, 'true');
  } catch {
    // localStorage may be unavailable — non-critical
  }
}

export async function loadConstruction(): Promise<{
  state: ConstructionState;
  past: ConstructionState[];
  future: ConstructionState[];
} | null> {
  try {
    let serialized = await get<string>(CONSTRUCTION_KEY);
    let undoKey = UNDO_KEY;

    // Fallback to legacy TraceVite keys
    if (!serialized) {
      serialized = await get<string>(LEGACY_CONSTRUCTION_KEY);
      undoKey = LEGACY_UNDO_KEY;
    }

    if (!serialized) return null;

    const state = deserializeState(serialized);

    // Load undo history
    const undoData = await get<string>(undoKey);
    let past: ConstructionState[] = [];
    let future: ConstructionState[] = [];

    if (undoData) {
      try {
        const parsed = JSON.parse(undoData) as { past: string[]; future: string[] };
        past = parsed.past.map(deserializeState);
        future = parsed.future.map(deserializeState);
      } catch {
        // Corrupted undo history — start fresh, no data loss on construction
      }
    }

    return { state, past, future };
  } catch {
    return null;
  }
}

// ── Deep Freeze detection (spec §17.1) ────────────────────

export type LaunchStatus = 'first_launch' | 'normal' | 'deep_freeze';

export async function detectLaunchStatus(): Promise<LaunchStatus> {
  try {
    const idbFlag =
      (await get<boolean>(LAUNCHED_FLAG_IDB)) || (await get<boolean>(LEGACY_LAUNCHED_FLAG_IDB));
    const lsFlag = hasLocalStorageFlag();

    if (idbFlag) return 'normal'; // IndexedDB has data
    if (lsFlag) return 'deep_freeze'; // LS flag exists but IDB empty
    return 'first_launch'; // Both empty
  } catch {
    return 'first_launch';
  }
}

function hasLocalStorageFlag(): boolean {
  try {
    return (
      localStorage.getItem(LAUNCHED_FLAG_LS) !== null ||
      localStorage.getItem(LEGACY_LAUNCHED_FLAG_LS) !== null
    );
  } catch {
    return false;
  }
}
