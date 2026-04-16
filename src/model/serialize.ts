/**
 * Serialization/deserialization for .geomolo files and IndexedDB.
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
  textBoxes?: ConstructionState['textBoxes'];
  settings: {
    gridSizeMm: ConstructionState['gridSizeMm'];
    snapEnabled: ConstructionState['snapEnabled'];
    displayMode: ConstructionState['displayMode'];
    displayUnit: ConstructionState['displayUnit'];
    hideProperties: ConstructionState['hideProperties'];
    hidePropertiesUserSet?: ConstructionState['hidePropertiesUserSet'];
    toleranceProfile?: ConstructionState['toleranceProfile'];
    chainTimeoutMs?: ConstructionState['chainTimeoutMs'];
    fontScale?: ConstructionState['fontScale'];
    keyboardShortcutsEnabled?: ConstructionState['keyboardShortcutsEnabled'];
    soundMode?: ConstructionState['soundMode'];
    soundGain?: ConstructionState['soundGain'];
    pointToolVisible?: ConstructionState['pointToolVisible'];
    estimationMode?: ConstructionState['estimationMode'];
    cartesianMode?: ConstructionState['cartesianMode'];
    autoIntersection?: ConstructionState['autoIntersection'];
    clutterThreshold?: ConstructionState['clutterThreshold'];
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
    textBoxes: state.textBoxes.length > 0 ? state.textBoxes : undefined,
    settings: {
      gridSizeMm: state.gridSizeMm,
      snapEnabled: state.snapEnabled,
      displayMode: state.displayMode,
      displayUnit: state.displayUnit,
      hideProperties: state.hideProperties,
      hidePropertiesUserSet: state.hidePropertiesUserSet || undefined,
      toleranceProfile: state.toleranceProfile !== 'default' ? state.toleranceProfile : undefined,
      chainTimeoutMs: state.chainTimeoutMs !== 8000 ? state.chainTimeoutMs : undefined,
      fontScale: state.fontScale !== 1 ? state.fontScale : undefined,
      keyboardShortcutsEnabled: state.keyboardShortcutsEnabled || undefined,
      soundMode: state.soundMode !== 'reduced' ? state.soundMode : undefined,
      soundGain: state.soundGain !== 0.5 ? state.soundGain : undefined,
      pointToolVisible: state.pointToolVisible || undefined,
      estimationMode: state.estimationMode || undefined,
      cartesianMode: state.cartesianMode !== 'off' ? state.cartesianMode : undefined,
      autoIntersection: state.autoIntersection !== true ? state.autoIntersection : undefined,
      clutterThreshold: state.clutterThreshold > 0 ? state.clutterThreshold : undefined,
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

  if (obj['version'] < 1) {
    throw new Error('VERSION_INVALID');
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
    textBoxes: Array.isArray(obj['textBoxes'])
      ? (obj['textBoxes'] as ConstructionState['textBoxes'])
      : [],
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
      typeof settings['hideProperties'] === 'boolean'
        ? settings['hideProperties']
        : defaults.hideProperties,
    hidePropertiesUserSet:
      typeof settings['hidePropertiesUserSet'] === 'boolean'
        ? settings['hidePropertiesUserSet']
        : defaults.hidePropertiesUserSet,
    toleranceProfile: isValidToleranceProfile(settings['toleranceProfile'])
      ? settings['toleranceProfile']
      : defaults.toleranceProfile,
    chainTimeoutMs: isValidChainTimeout(settings['chainTimeoutMs'])
      ? settings['chainTimeoutMs']
      : defaults.chainTimeoutMs,
    fontScale: isValidFontScale(settings['fontScale']) ? settings['fontScale'] : defaults.fontScale,
    keyboardShortcutsEnabled:
      typeof settings['keyboardShortcutsEnabled'] === 'boolean'
        ? settings['keyboardShortcutsEnabled']
        : defaults.keyboardShortcutsEnabled,
    soundMode: isValidSoundMode(settings['soundMode']) ? settings['soundMode'] : defaults.soundMode,
    soundGain: isValidGain(settings['soundGain']) ? settings['soundGain'] : defaults.soundGain,
    pointToolVisible:
      typeof settings['pointToolVisible'] === 'boolean'
        ? settings['pointToolVisible']
        : defaults.pointToolVisible,
    estimationMode:
      typeof settings['estimationMode'] === 'boolean'
        ? settings['estimationMode']
        : defaults.estimationMode,
    cartesianMode:
      settings['cartesianMode'] === '1quadrant' || settings['cartesianMode'] === '4quadrants'
        ? settings['cartesianMode']
        : defaults.cartesianMode,
    autoIntersection:
      typeof settings['autoIntersection'] === 'boolean'
        ? settings['autoIntersection']
        : defaults.autoIntersection,
    clutterThreshold:
      typeof settings['clutterThreshold'] === 'number' &&
      Number.isFinite(settings['clutterThreshold']) &&
      settings['clutterThreshold'] >= 0
        ? settings['clutterThreshold']
        : defaults.clutterThreshold,
  };
}

function isValidToleranceProfile(v: unknown): v is 'default' | 'large' | 'very_large' {
  return v === 'default' || v === 'large' || v === 'very_large';
}

function isValidChainTimeout(v: unknown): v is 0 | 5000 | 8000 | 15000 {
  return v === 0 || v === 5000 || v === 8000 || v === 15000;
}

function isValidFontScale(v: unknown): v is 1 | 1.25 | 1.5 {
  return v === 1 || v === 1.25 || v === 1.5;
}

function isValidSoundMode(v: unknown): v is 'off' | 'reduced' | 'full' {
  return v === 'off' || v === 'reduced' || v === 'full';
}

function isValidGain(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
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
