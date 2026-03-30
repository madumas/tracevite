/**
 * .tracevite-config settings profile export/import.
 */

import type { ConstructionState, DisplayMode, DisplayUnit, GridSize } from './types';
import type { ToleranceProfile } from '@/config/accessibility';

export interface SettingsProfile {
  readonly type: 'tracevite-settings';
  readonly version: 1;
  readonly displayMode: DisplayMode;
  readonly displayUnit: DisplayUnit;
  readonly gridSizeMm: GridSize;
  readonly snapEnabled: boolean;
  readonly toleranceProfile: ToleranceProfile;
  readonly hideProperties: boolean;
}

/** Export current settings to JSON string. */
export function exportSettings(state: ConstructionState): string {
  const profile: SettingsProfile = {
    type: 'tracevite-settings',
    version: 1,
    displayMode: state.displayMode,
    displayUnit: state.displayUnit,
    gridSizeMm: state.gridSizeMm,
    snapEnabled: state.snapEnabled,
    toleranceProfile: 'default', // TODO: when tolerance profile is in state
    hideProperties: state.hideProperties,
  };
  return JSON.stringify(profile, null, 2);
}

/** Mutable subset for building import results. */
type MutableSettings = {
  -readonly [K in keyof Pick<
    ConstructionState,
    'displayMode' | 'displayUnit' | 'gridSizeMm' | 'snapEnabled' | 'hideProperties'
  >]?: ConstructionState[K];
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

  if (obj['type'] !== 'tracevite-settings') throw new Error('WRONG_FILE_TYPE');

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

  return result;
}
