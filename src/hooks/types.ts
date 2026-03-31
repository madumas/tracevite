import type { ReactNode } from 'react';
import type { SnapResult } from '@/model/types';

/**
 * Unified interface returned by all tool hooks.
 * Allows App.tsx to stay stable as tools are added.
 */
export interface ToolHookResult {
  /** Handle a click on the canvas (in mm). */
  handleClick: (mmPos: { x: number; y: number }) => void;
  /** Handle cursor movement (in mm). */
  handleCursorMove: (mmPos: { x: number; y: number }) => void;
  /** Handle Escape key. */
  handleEscape: () => void;
  /** Reset tool to idle state. */
  reset: () => void;
  /** Whether the tool is idle (no action in progress). */
  isIdle: boolean;
  /** Current status bar message for this tool. */
  statusMessage: string;
  /** Current snap result for SnapFeedback rendering. */
  snapResult: SnapResult | null;
  /** SVG overlay elements to render in the canvas (ghost segment, circle, etc.). */
  overlayElements: ReactNode;
  /** True when active motor gesture in progress (drawing, moving). */
  isActiveGesture?: boolean;
  /** During move: ID of the point being moved. */
  activePointId?: string | null;
  /** Reflection tool: symmetry check mode toggle (v2). */
  symmetryCheckMode?: boolean;
  /** Reflection tool: toggle symmetry check mode (v2). */
  onToggleSymmetryCheck?: () => void;
  /** Reflection tool: step-by-step animation toggle (v2). */
  stepByStep?: boolean;
  /** Reflection tool: toggle step-by-step mode (v2). */
  onToggleStepByStep?: () => void;
}
