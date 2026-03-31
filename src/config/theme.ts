/**
 * Color palette and visual constants — spec §13.2.
 * Single source of truth for all colors used in canvas and UI.
 */

// ── Canvas colors ──────────────────────────────────────────
export const CANVAS_BG = '#FAFCFF';
export const CANVAS_GRID = '#E5E5E5';
export const CANVAS_GRID_OPACITY = 0.5;
export const CANVAS_SEGMENT = '#185FA5';
export const CANVAS_POINT = '#185FA5';
export const CANVAS_LABEL = '#185FA5';
export const CANVAS_GUIDE = '#0B7285';
export const CANVAS_ANGLE = '#C24B22';
export const CANVAS_MEASUREMENT = '#3A6291';
export const CANVAS_GHOST = '#85B7EB';
export const CANVAS_GHOST_OPACITY = 0.6;
export const CANVAS_SELECTION_BG = '#D0E2F5';

// ── UI colors ──────────────────────────────────────────────
export const UI_BG = '#F5F7FA';
export const UI_SURFACE = '#FFFFFF';
export const UI_PRIMARY = '#185FA5';
export const UI_PRIMARY_HOVER = '#134D87';
export const UI_DESTRUCTIVE = '#C82828';
export const UI_DESTRUCTIVE_HOVER = '#A02020';
export const UI_DISABLED_BG = '#E8ECF0';
export const UI_DISABLED_TEXT = '#9CA3AF';
export const UI_TEXT_PRIMARY = '#1A2433';
export const UI_TEXT_SECONDARY = '#4A5568';
export const UI_BORDER = '#D1D8E0';
export const UI_FOCUS = '#185FA5';

// ── Layout dimensions (px) ─────────────────────────────────
export const TOOLBAR_HEIGHT = 64;
export const STATUS_BAR_HEIGHT = 32;
export const STATUS_BAR_BG = '#E3EBF5';
export const CONSIGNE_HEIGHT = 40;
export const ACTION_BAR_HEIGHT = 44;
export const PANEL_WIDTH = 220;

// ── PDF colors (black & white only) ────────────────────────
export const PDF_STROKE = '#000000';
export const PDF_LABEL = '#000000';
export const PDF_MEASUREMENT = '#333333';

// ── High-contrast canvas colors (v2) ──────────────────────
const HC_CANVAS_BG = '#FFFFFF';
const HC_CANVAS_GRID = '#CCCCCC';
const HC_CANVAS_SEGMENT = '#000000';
const HC_CANVAS_POINT = '#000000';
const HC_CANVAS_LABEL = '#000000';
const HC_CANVAS_GUIDE = '#000000';
const HC_CANVAS_ANGLE = '#000000';
const HC_CANVAS_MEASUREMENT = '#000000';
const HC_CANVAS_GHOST = '#666666';
const HC_CANVAS_SELECTION_BG = '#E0E0E0';

export interface CanvasColors {
  readonly bg: string;
  readonly grid: string;
  readonly gridOpacity: number;
  readonly segment: string;
  readonly point: string;
  readonly label: string;
  readonly guide: string;
  readonly angle: string;
  readonly measurement: string;
  readonly ghost: string;
  readonly ghostOpacity: number;
  readonly selectionBg: string;
  readonly strokeWidth: number; // normal: 2, high contrast: 3
}

const NORMAL_COLORS: CanvasColors = {
  bg: CANVAS_BG,
  grid: CANVAS_GRID,
  gridOpacity: CANVAS_GRID_OPACITY,
  segment: CANVAS_SEGMENT,
  point: CANVAS_POINT,
  label: CANVAS_LABEL,
  guide: CANVAS_GUIDE,
  angle: CANVAS_ANGLE,
  measurement: CANVAS_MEASUREMENT,
  ghost: CANVAS_GHOST,
  ghostOpacity: CANVAS_GHOST_OPACITY,
  selectionBg: CANVAS_SELECTION_BG,
  strokeWidth: 2,
};

const HIGH_CONTRAST_COLORS: CanvasColors = {
  bg: HC_CANVAS_BG,
  grid: HC_CANVAS_GRID,
  gridOpacity: 0.8,
  segment: HC_CANVAS_SEGMENT,
  point: HC_CANVAS_POINT,
  label: HC_CANVAS_LABEL,
  guide: HC_CANVAS_GUIDE,
  angle: HC_CANVAS_ANGLE,
  measurement: HC_CANVAS_MEASUREMENT,
  ghost: HC_CANVAS_GHOST,
  ghostOpacity: 0.8,
  selectionBg: HC_CANVAS_SELECTION_BG,
  strokeWidth: 3,
};

/** Get canvas color set based on contrast mode. */
export function getCanvasColors(highContrast: boolean): CanvasColors {
  return highContrast ? HIGH_CONTRAST_COLORS : NORMAL_COLORS;
}

// ── Canvas colors React context ───────────────────────────
import { createContext, useContext } from 'react';

const CanvasColorsContext = createContext<CanvasColors>(NORMAL_COLORS);

export const CanvasColorsProvider = CanvasColorsContext.Provider;

/** Access canvas colors from the nearest CanvasColorsProvider. */
export function useCanvasColors(): CanvasColors {
  return useContext(CanvasColorsContext);
}
