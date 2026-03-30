/**
 * Accessibility constants for TDC (Trouble Développemental de la Coordination).
 * All distance values in physical mm unless noted.
 * Multiplied by tolerance profile factor at runtime.
 */

import type { ToleranceProfile } from '@/model/types';

/** Drag threshold: movement < this from pointerdown = click, not drag. */
export const DRAG_THRESHOLD_MM = 1.5;

/** Snap zone: existing points. */
export const SNAP_TOLERANCE_POINT_MM = 7;

/** Snap zone: segment midpoints (Milestone B). */
export const SNAP_TOLERANCE_MIDPOINT_MM = 5;

/** Snap zone: grid intersections. */
export const SNAP_TOLERANCE_GRID_MM = 5;

/** Snap zone: angle snap (±degrees). */
export const SNAP_TOLERANCE_ANGLE_DEG = 5;

/** Snap zone: alignment guide. */
export const SNAP_TOLERANCE_ALIGNMENT_MM = 2;

/** Click debounce — prevents accidental double-tap (DCD finger re-bound). */
export const CLICK_DEBOUNCE_MS = 150;

/** Chaining inactivity timeout. Configurable: 5s / 8s / 15s / off. */
export const CHAIN_TIMEOUT_MS = 8000;

/** Mouse movement threshold to reset chaining timer. */
export const CHAIN_MOVEMENT_THRESHOLD_MM = 3;

/** Point display radius on screen. */
export const POINT_DISPLAY_RADIUS_MM = 4;

/** Point display radius on PDF. */
export const POINT_PDF_RADIUS_MM = 1;

/** Segment hit zone (each side of segment center line). */
export const SEGMENT_HIT_ZONE_MM = 5;

/** Minimum distance between two distinct points. Below = forced merge. */
export const MIN_POINT_DISTANCE_MM = 2;

/** Delay before showing length input after segment creation. */
export const LENGTH_INPUT_DELAY_MS = 300;

/** Minimum font size on canvas (px). */
export const MIN_CANVAS_FONT_PX = 13;

/** Minimum button target (px). */
export const MIN_BUTTON_SIZE_PX = 44;

/** Minimum spacing between adjacent buttons (px). */
export const MIN_BUTTON_GAP_PX = 8;

/** Undo history depth. */
export const MAX_UNDO_LEVELS = 100;

/** Auto-save debounce. */
export const AUTO_SAVE_DEBOUNCE_MS = 2000;

/**
 * Tolerance profile multipliers.
 * 'default' — mild to moderate DCD
 * 'large' — younger children (8-9 years)
 * 'very_large' — severe DCD
 */
export const TOLERANCE_PROFILES: Record<ToleranceProfile, number> = {
  default: 1.0,
  large: 1.5,
  very_large: 2.0,
};
