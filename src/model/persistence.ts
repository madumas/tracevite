/**
 * Deep Freeze detection — uses flags written by saveSlotData (see slot-persistence.ts).
 * Legacy single-key save/load (saveConstruction/loadConstruction) was removed after
 * multi-slot migration; flags are now written inside saveSlotData.
 */

import { get } from 'idb-keyval';

// ── Keys ──────────────────────────────────────────────────

export const LAUNCHED_FLAG_IDB = 'geomolo_launched';
export const LAUNCHED_FLAG_LS = 'geomolo_launched';

// Legacy keys for migration from TraceVite
const LEGACY_LAUNCHED_FLAG_IDB = 'tracevite_launched';
const LEGACY_LAUNCHED_FLAG_LS = 'tracevite_launched';

// ── Deep Freeze detection (spec §17.1) ────────────────────

export type LaunchStatus = 'first_launch' | 'normal' | 'deep_freeze';

export async function detectLaunchStatus(): Promise<LaunchStatus> {
  try {
    const idbFlag =
      (await get<boolean>(LAUNCHED_FLAG_IDB)) || (await get<boolean>(LEGACY_LAUNCHED_FLAG_IDB));
    const lsFlag = hasLocalStorageFlag();

    if (idbFlag) return 'normal'; // IndexedDB has data
    if (lsFlag) {
      // Check whether storage is persistent. If storage is ephemeral (private mode,
      // some iOS contexts), don't flag as Deep Freeze — it's likely a normal eviction.
      if (await isStorageEphemeral()) return 'first_launch';
      return 'deep_freeze'; // LS flag exists but IDB empty on persistent storage
    }
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

/**
 * Returns true when browser storage is not guaranteed to persist (private mode,
 * Safari iOS ITP, etc.). Avoids false-positive Deep Freeze warnings.
 */
async function isStorageEphemeral(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return false;
    const persisted = await navigator.storage.persisted();
    return !persisted;
  } catch {
    return false;
  }
}
