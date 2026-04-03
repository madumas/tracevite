/**
 * User preferences — settings that are NOT tied to a specific construction.
 * Persisted in localStorage (not in .geomolo files, not in undo stack).
 * These are per-user settings that persist across constructions.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

// ── Types ────────────────────────────────────────────────

/** Available segment color choices (spec §19 v2). */
export type SegmentColor = '#0a7e7a' | '#0F6E56' | '#6D28D9' | '#C24B22';

/** Page format for PDF export. */
export type PageFormat = 'letter' | 'a4';

/** Panel position for left-hand accommodation. */
export type PanelPosition = 'left' | 'right';

export interface UserPreferences {
  readonly panelPosition: PanelPosition;
  readonly segmentColor: SegmentColor;
  readonly highContrast: boolean;
  readonly cursorSmoothing: boolean;
  readonly fatigueReminderMinutes: number | null; // null = off
  readonly pageFormat: PageFormat;
  readonly reinforcedGrid: boolean;
  readonly focusMode: boolean;
  readonly animateTransformations: boolean;
}

// ── Defaults ─────────────────────────────────────────────

const DEFAULT_PREFERENCES: UserPreferences = {
  panelPosition: 'right',
  segmentColor: '#0a7e7a',
  highContrast: false,
  cursorSmoothing: false,
  fatigueReminderMinutes: null,
  pageFormat: 'letter',
  reinforcedGrid: false,
  focusMode: false,
  animateTransformations: false,
};

// ── localStorage persistence ─────────────────────────────

const STORAGE_KEY = 'geomolo-user-preferences';
const LEGACY_STORAGE_KEY = 'tracevite-user-preferences';

const VALID_SEGMENT_COLORS: SegmentColor[] = ['#0a7e7a', '#0F6E56', '#6D28D9', '#C24B22'];
const VALID_PAGE_FORMATS: PageFormat[] = ['letter', 'a4'];
const VALID_PANEL_POSITIONS: PanelPosition[] = ['left', 'right'];

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      panelPosition: VALID_PANEL_POSITIONS.includes(data.panelPosition as PanelPosition)
        ? (data.panelPosition as PanelPosition)
        : DEFAULT_PREFERENCES.panelPosition,
      segmentColor: VALID_SEGMENT_COLORS.includes(data.segmentColor as SegmentColor)
        ? (data.segmentColor as SegmentColor)
        : DEFAULT_PREFERENCES.segmentColor,
      highContrast:
        typeof data.highContrast === 'boolean'
          ? data.highContrast
          : DEFAULT_PREFERENCES.highContrast,
      cursorSmoothing:
        typeof data.cursorSmoothing === 'boolean'
          ? data.cursorSmoothing
          : DEFAULT_PREFERENCES.cursorSmoothing,
      fatigueReminderMinutes:
        data.fatigueReminderMinutes === null ||
        (typeof data.fatigueReminderMinutes === 'number' && data.fatigueReminderMinutes > 0)
          ? (data.fatigueReminderMinutes as number | null)
          : DEFAULT_PREFERENCES.fatigueReminderMinutes,
      pageFormat: VALID_PAGE_FORMATS.includes(data.pageFormat as PageFormat)
        ? (data.pageFormat as PageFormat)
        : DEFAULT_PREFERENCES.pageFormat,
      reinforcedGrid:
        typeof data.reinforcedGrid === 'boolean'
          ? data.reinforcedGrid
          : DEFAULT_PREFERENCES.reinforcedGrid,
      focusMode:
        typeof data.focusMode === 'boolean' ? data.focusMode : DEFAULT_PREFERENCES.focusMode,
      animateTransformations:
        typeof data.animateTransformations === 'boolean'
          ? data.animateTransformations
          : DEFAULT_PREFERENCES.animateTransformations,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage may be full or blocked — silent fail
  }
}

// ── React Context ────────────────────────────────────────

interface PreferencesContextValue {
  readonly preferences: UserPreferences;
  readonly updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────

interface PreferencesProviderProps {
  readonly children: ReactNode;
  readonly initialPreferences?: UserPreferences;
}

export function PreferencesProvider({ children, initialPreferences }: PreferencesProviderProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    initialPreferences ?? loadPreferences,
  );

  // Persist on every change
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ preferences, updatePreference }),
    [preferences, updatePreference],
  );

  return <PreferencesContext.Provider value={contextValue}>{children}</PreferencesContext.Provider>;
}

// ── Hooks ────────────────────────────────────────────────

/** Access user preferences (read-only). */
export function usePreferences(): UserPreferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx.preferences;
}

/** Access the preference updater function. */
export function useUpdatePreference(): PreferencesContextValue['updatePreference'] {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('useUpdatePreference must be used within PreferencesProvider');
  return ctx.updatePreference;
}
