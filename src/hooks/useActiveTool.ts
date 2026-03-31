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
import { usePointTool } from './usePointTool';
import { useReproduceTool } from './useReproduceTool';
import { useConstrainedLineTool } from './useConstrainedLineTool';
import { useTranslationTool } from './useTranslationTool';
import { useCompareTool } from './useCompareTool';
import { useFriezeTool } from './useFriezeTool';

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
  const active = state.activeTool;
  const segmentTool = useSegmentTool({
    state,
    dispatch,
    viewport,
    shiftConstraintActive,
    isActive: active === 'segment',
  });
  const moveTool = useMoveTool({ state, dispatch, viewport, isActive: active === 'move' });
  const circleTool = useCircleTool({ state, dispatch, viewport, isActive: active === 'circle' });
  const reflectionTool = useReflectionTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'reflection',
  });
  const pointTool = usePointTool({ state, dispatch, viewport, isActive: active === 'point' });
  const reproduceTool = useReproduceTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'reproduce',
  });
  const perpendicularTool = useConstrainedLineTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'perpendicular',
    toolType: 'perpendicular',
  });
  const parallelTool = useConstrainedLineTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'parallel',
    toolType: 'parallel',
  });
  const translationTool = useTranslationTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'translation',
  });
  const compareTool = useCompareTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'compare',
  });
  const friezeTool = useFriezeTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'frieze',
  });

  switch (state.activeTool) {
    case 'segment':
      return segmentTool;
    case 'move':
      return moveTool;
    case 'circle':
      return circleTool;
    case 'reflection':
      return reflectionTool;
    case 'point':
      return pointTool;
    case 'reproduce':
      return reproduceTool;
    case 'perpendicular':
      return perpendicularTool;
    case 'parallel':
      return parallelTool;
    case 'translation':
      return translationTool;
    case 'compare':
      return compareTool;
    case 'frieze':
      return friezeTool;
  }
}
