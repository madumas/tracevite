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
    schoolLevel: ConstructionState['schoolLevel'];
    displayUnit: ConstructionState['displayUnit'];
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
      schoolLevel: state.schoolLevel,
      displayUnit: state.displayUnit,
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
    schoolLevel: isValidSchoolLevel(settings['schoolLevel'])
      ? settings['schoolLevel']
      : defaults.schoolLevel,
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

function isValidSchoolLevel(v: unknown): v is '2e_cycle' | '3e_cycle' {
  return v === '2e_cycle' || v === '3e_cycle';
}

function isValidDisplayUnit(v: unknown): v is 'cm' | 'mm' {
  return v === 'cm' || v === 'mm';
}
