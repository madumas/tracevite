/**
 * Serialization/deserialization for .tracevite files and IndexedDB.
 * Includes version field for future migration.
 */

import type { ConstructionState } from './types';
import { FILE_VERSION } from './types';
import { createInitialState } from './state';

interface SerializedConstruction {
  version: number;
  points: ConstructionState['points'];
  segments: ConstructionState['segments'];
  circles: ConstructionState['circles'];
  settings: {
    gridSizeMm: ConstructionState['gridSizeMm'];
    snapEnabled: ConstructionState['snapEnabled'];
    displayMode: ConstructionState['displayMode'];
    displayUnit: ConstructionState['displayUnit'];
    hideProperties: ConstructionState['hideProperties'];
  };
  consigne: string | null;
}

/** Serialize construction state to JSON string. */
export function serializeState(state: ConstructionState): string {
  const data: SerializedConstruction = {
    version: FILE_VERSION,
    points: state.points,
    segments: state.segments,
    circles: state.circles,
    settings: {
      gridSizeMm: state.gridSizeMm,
      snapEnabled: state.snapEnabled,
      displayMode: state.displayMode,
      displayUnit: state.displayUnit,
      hideProperties: state.hideProperties,
    },
    consigne: state.consigne,
  };
  return JSON.stringify(data);
}

/** Deserialize JSON string to construction state. Throws on invalid input. */
export function deserializeState(json: string): ConstructionState {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('INVALID_JSON');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('INVALID_FORMAT');
  }

  const obj = data as Record<string, unknown>;

  // Version check
  if (typeof obj['version'] !== 'number') {
    throw new Error('MISSING_VERSION');
  }

  if (obj['version'] > FILE_VERSION) {
    throw new Error('VERSION_TOO_NEW');
  }

  // Extract with defaults for forward compatibility
  const defaults = createInitialState();

  const settings =
    obj['settings'] && typeof obj['settings'] === 'object'
      ? (obj['settings'] as Record<string, unknown>)
      : {};

  return {
    points: Array.isArray(obj['points'])
      ? (obj['points'] as ConstructionState['points'])
      : defaults.points,
    segments: Array.isArray(obj['segments'])
      ? (obj['segments'] as ConstructionState['segments'])
      : defaults.segments,
    circles: Array.isArray(obj['circles'])
      ? (obj['circles'] as ConstructionState['circles'])
      : defaults.circles,
    gridSizeMm: isValidGridSize(settings['gridSizeMm'])
      ? settings['gridSizeMm']
      : defaults.gridSizeMm,
    snapEnabled:
      typeof settings['snapEnabled'] === 'boolean' ? settings['snapEnabled'] : defaults.snapEnabled,
    displayMode: migrateDisplayMode(settings, obj['version'] as number) ?? defaults.displayMode,
    displayUnit: isValidDisplayUnit(settings['displayUnit'])
      ? settings['displayUnit']
      : defaults.displayUnit,
    activeTool: defaults.activeTool,
    selectedElementId: null,
    consigne: typeof obj['consigne'] === 'string' ? obj['consigne'] : null,
    hideProperties:
      typeof settings['hideProperties'] === 'boolean' ? settings['hideProperties'] : false,
  };
}

function isValidGridSize(v: unknown): v is 5 | 10 | 20 {
  return v === 5 || v === 10 || v === 20;
}

function isValidDisplayMode(v: unknown): v is 'simplifie' | 'complet' {
  return v === 'simplifie' || v === 'complet';
}

/** Migrate v1 schoolLevel to v2 displayMode. */
function migrateDisplayMode(
  settings: Record<string, unknown>,
  version: number,
): 'simplifie' | 'complet' | null {
  if (version >= 2) {
    return isValidDisplayMode(settings['displayMode']) ? settings['displayMode'] : null;
  }
  // v1: map schoolLevel → displayMode
  const level = settings['schoolLevel'];
  if (level === '3e_cycle') return 'complet';
  if (level === '2e_cycle') return 'simplifie';
  return null;
}

function isValidDisplayUnit(v: unknown): v is 'cm' | 'mm' {
  return v === 'cm' || v === 'mm';
}
