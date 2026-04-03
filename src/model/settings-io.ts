/**
 * .geomolo-config settings profile export/import.
 */

import type {
  ConstructionState,
  DisplayMode,
  DisplayUnit,
  GridSize,
  ToleranceProfile,
  ChainTimeout,
  FontScale,
  SoundMode,
  CartesianMode,
} from './types';

export interface SettingsProfile {
  readonly type: 'geomolo-settings' | 'tracevite-settings';
  readonly version: 1;
  readonly displayMode: DisplayMode;
  readonly displayUnit: DisplayUnit;
  readonly gridSizeMm: GridSize;
  readonly snapEnabled: boolean;
  readonly toleranceProfile: ToleranceProfile;
  readonly hideProperties: boolean;
  readonly chainTimeoutMs: ChainTimeout;
  readonly fontScale: FontScale;
  readonly keyboardShortcutsEnabled: boolean;
  readonly soundMode: SoundMode;
  readonly soundGain: number;
  readonly pointToolVisible: boolean;
  readonly estimationMode?: boolean;
  readonly cartesianMode?: CartesianMode;
  readonly autoIntersection?: boolean;
  readonly clutterThreshold?: number;
  readonly focusMode?: boolean;
  readonly reinforcedGrid?: boolean;
  readonly animateTransformations?: boolean;
}

/** Export current settings to JSON string. */
export function exportSettings(
  state: ConstructionState,
  prefs?: { focusMode?: boolean; reinforcedGrid?: boolean; animateTransformations?: boolean },
): string {
  const profile: SettingsProfile = {
    type: 'geomolo-settings',
    version: 1,
    displayMode: state.displayMode,
    displayUnit: state.displayUnit,
    gridSizeMm: state.gridSizeMm,
    snapEnabled: state.snapEnabled,
    toleranceProfile: state.toleranceProfile,
    hideProperties: state.hideProperties,
    chainTimeoutMs: state.chainTimeoutMs,
    fontScale: state.fontScale,
    keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
    soundMode: state.soundMode,
    soundGain: state.soundGain,
    pointToolVisible: state.pointToolVisible,
    estimationMode: state.estimationMode || undefined,
    cartesianMode: state.cartesianMode !== 'off' ? state.cartesianMode : undefined,
    autoIntersection: state.autoIntersection || undefined,
    clutterThreshold: state.clutterThreshold || undefined,
    focusMode: prefs?.focusMode || undefined,
    reinforcedGrid: prefs?.reinforcedGrid || undefined,
  };
  return JSON.stringify(profile, null, 2);
}

/** Mutable subset for building import results. */
type MutableSettings = {
  -readonly [K in keyof Pick<
    ConstructionState,
    | 'displayMode'
    | 'displayUnit'
    | 'gridSizeMm'
    | 'snapEnabled'
    | 'hideProperties'
    | 'toleranceProfile'
    | 'chainTimeoutMs'
    | 'fontScale'
    | 'keyboardShortcutsEnabled'
    | 'soundMode'
    | 'soundGain'
    | 'pointToolVisible'
    | 'estimationMode'
    | 'cartesianMode'
    | 'autoIntersection'
    | 'clutterThreshold'
  >]?: ConstructionState[K];
} & {
  focusMode?: boolean;
  reinforcedGrid?: boolean;
  animateTransformations?: boolean;
};

/** Import settings from JSON string. Returns partial settings to apply. */
export function importSettings(json: string): MutableSettings {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('INVALID_JSON');
  }

  if (!data || typeof data !== 'object') throw new Error('INVALID_FORMAT');
  const obj = data as Record<string, unknown>;

  if (obj['type'] !== 'geomolo-settings' && obj['type'] !== 'tracevite-settings')
    throw new Error('WRONG_FILE_TYPE');

  const result: MutableSettings = {};

  // Accept new displayMode or legacy schoolLevel
  if (obj['displayMode'] === 'simplifie' || obj['displayMode'] === 'complet') {
    result.displayMode = obj['displayMode'];
  } else if (obj['schoolLevel'] === '3e_cycle') {
    result.displayMode = 'complet';
  } else if (obj['schoolLevel'] === '2e_cycle') {
    result.displayMode = 'simplifie';
  }
  if (obj['displayUnit'] === 'cm' || obj['displayUnit'] === 'mm') {
    result.displayUnit = obj['displayUnit'];
  }
  if (obj['gridSizeMm'] === 5 || obj['gridSizeMm'] === 10 || obj['gridSizeMm'] === 20) {
    result.gridSizeMm = obj['gridSizeMm'];
  }
  if (typeof obj['snapEnabled'] === 'boolean') {
    result.snapEnabled = obj['snapEnabled'];
  }
  if (typeof obj['hideProperties'] === 'boolean') {
    result.hideProperties = obj['hideProperties'];
  }

  const validTolerances: ToleranceProfile[] = ['default', 'large', 'very_large'];
  if (validTolerances.includes(obj['toleranceProfile'] as ToleranceProfile)) {
    result.toleranceProfile = obj['toleranceProfile'] as ToleranceProfile;
  }

  const validTimeouts: ChainTimeout[] = [0, 5000, 8000, 15000];
  if (validTimeouts.includes(obj['chainTimeoutMs'] as ChainTimeout)) {
    result.chainTimeoutMs = obj['chainTimeoutMs'] as ChainTimeout;
  }

  const validFontScales: FontScale[] = [1, 1.25, 1.5];
  if (validFontScales.includes(obj['fontScale'] as FontScale)) {
    result.fontScale = obj['fontScale'] as FontScale;
  }

  if (typeof obj['keyboardShortcutsEnabled'] === 'boolean') {
    result.keyboardShortcutsEnabled = obj['keyboardShortcutsEnabled'];
  }

  const validSoundModes: SoundMode[] = ['off', 'reduced', 'full'];
  if (validSoundModes.includes(obj['soundMode'] as SoundMode)) {
    result.soundMode = obj['soundMode'] as SoundMode;
  }

  if (typeof obj['soundGain'] === 'number' && obj['soundGain'] >= 0 && obj['soundGain'] <= 1) {
    result.soundGain = obj['soundGain'];
  }

  if (typeof obj['pointToolVisible'] === 'boolean') {
    result.pointToolVisible = obj['pointToolVisible'];
  }

  if (typeof obj['estimationMode'] === 'boolean') {
    result.estimationMode = obj['estimationMode'];
  }

  const validCartesian: CartesianMode[] = ['off', '1quadrant', '4quadrants'];
  if (validCartesian.includes(obj['cartesianMode'] as CartesianMode)) {
    result.cartesianMode = obj['cartesianMode'] as CartesianMode;
  }

  if (typeof obj['autoIntersection'] === 'boolean') {
    result.autoIntersection = obj['autoIntersection'];
  }

  if (typeof obj['clutterThreshold'] === 'number' && obj['clutterThreshold'] >= 0) {
    result.clutterThreshold = obj['clutterThreshold'];
  }

  if (typeof obj['focusMode'] === 'boolean') {
    result.focusMode = obj['focusMode'];
  }

  if (typeof obj['reinforcedGrid'] === 'boolean') {
    result.reinforcedGrid = obj['reinforcedGrid'];
  }

  if (typeof obj['animateTransformations'] === 'boolean') {
    result.animateTransformations = obj['animateTransformations'];
  }

  return result;
}
