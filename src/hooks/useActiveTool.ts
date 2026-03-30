/**
 * Tool router — dispatches to the active tool hook.
 * Returns a unified ToolHookResult so App.tsx stays stable.
 */

import type { ConstructionState, ViewportState } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { useSegmentTool } from './useSegmentTool';
import { useMoveTool } from './useMoveTool';
import { useCircleTool } from './useCircleTool';
import { useReflectionTool } from './useReflectionTool';
import { useMeasureTool } from './useMeasureTool';
import { usePointTool } from './usePointTool';

interface UseActiveToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  shiftConstraintActive?: boolean;
}

/**
 * Routes to the appropriate tool hook based on state.activeTool.
 * All hooks called unconditionally (Rules of Hooks).
 */
export function useActiveTool({
  state,
  dispatch,
  viewport,
  shiftConstraintActive = false,
}: UseActiveToolOptions): ToolHookResult {
  const segmentTool = useSegmentTool({
    state,
    dispatch,
    viewport,
    shiftConstraintActive,
  });
  const moveTool = useMoveTool({ state, dispatch, viewport });
  const circleTool = useCircleTool({ state, dispatch, viewport });
  const reflectionTool = useReflectionTool({ state, dispatch, viewport });
  const measureTool = useMeasureTool({ state, dispatch, viewport });
  const pointTool = usePointTool({ state, dispatch, viewport });

  switch (state.activeTool) {
    case 'segment':
      return segmentTool;
    case 'move':
      return moveTool;
    case 'circle':
      return circleTool;
    case 'reflection':
      return reflectionTool;
    case 'measure':
      return measureTool;
    case 'point':
      return pointTool;
  }
}
