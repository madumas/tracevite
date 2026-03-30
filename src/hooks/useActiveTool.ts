/**
 * Tool router — dispatches to the active tool hook.
 * Returns a unified ToolHookResult so App.tsx stays stable.
 */

import type { ConstructionState, ViewportState } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { useSegmentTool } from './useSegmentTool';

interface UseActiveToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
}

/**
 * Routes to the appropriate tool hook based on state.activeTool.
 * Tools not yet implemented fall through to a no-op default.
 */
export function useActiveTool({ state, dispatch, viewport }: UseActiveToolOptions): ToolHookResult {
  // All hooks must be called unconditionally (Rules of Hooks).
  // We pass the active tool to each hook, and only the matching one acts.
  const segmentTool = useSegmentTool({ state, dispatch, viewport });

  // For now, only segment tool is implemented. Others will be added in B.3, B.5, B.6, B.7.
  switch (state.activeTool) {
    case 'segment':
      return segmentTool;
    default:
      // Placeholder for unimplemented tools — returns idle no-op
      return {
        ...segmentTool,
        handleClick: () => {},
        handleCursorMove: segmentTool.handleCursorMove, // keep cursor tracking for selection/hover
        handleEscape: () => {},
        isIdle: true,
        statusMessage: '',
        overlayElements: null,
      };
  }
}
