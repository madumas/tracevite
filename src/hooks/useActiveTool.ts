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
import { useSymmetryTool } from './useSymmetryTool';
import { useRotationTool } from './useRotationTool';
import { useHomothetyTool } from './useHomothetyTool';
import { useTextTool } from './useTextTool';
import { useSelectTool } from './useSelectTool';

interface UseActiveToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  shiftConstraintActive?: boolean;
  animateTransformations?: boolean;
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
  animateTransformations = false,
}: UseActiveToolOptions): ToolHookResult & {
  textEditingId: string | null;
  textStartEditing: (id: string) => void;
  textCommitEdit: (text: string) => void;
  textCancelEdit: () => void;
} {
  const active = state.activeTool;
  const selectTool = useSelectTool({ state, dispatch, isActive: active === 'select' });
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
    animateTransformations,
  });
  const pointTool = usePointTool({ state, dispatch, viewport, isActive: active === 'point' });
  const reproduceTool = useReproduceTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'reproduce',
    animateTransformations,
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
    animateTransformations,
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
    animateTransformations,
  });
  const symmetryTool = useSymmetryTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'symmetry',
  });
  const rotationTool = useRotationTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'rotation',
    animateTransformations,
  });
  const homothetyTool = useHomothetyTool({
    state,
    dispatch,
    viewport,
    isActive: active === 'homothety',
    animateTransformations,
  });

  const textTool = useTextTool({ state, dispatch, isActive: active === 'text' });

  // Text tool methods are always available (for double-click editing from any tool)
  const textFields = {
    textEditingId: textTool.editingId,
    textStartEditing: textTool.startEditing,
    textCommitEdit: textTool.commitEdit,
    textCancelEdit: textTool.cancelEdit,
  };

  const wrap = (t: ToolHookResult) => ({ ...t, ...textFields });

  switch (state.activeTool) {
    case 'select':
      return wrap(selectTool);
    case 'segment':
      return wrap(segmentTool);
    case 'move':
      return wrap(moveTool);
    case 'circle':
      return wrap(circleTool);
    case 'reflection':
      return wrap(reflectionTool);
    case 'point':
      return wrap(pointTool);
    case 'reproduce':
      return wrap(reproduceTool);
    case 'perpendicular':
      return wrap(perpendicularTool);
    case 'parallel':
      return wrap(parallelTool);
    case 'translation':
      return wrap(translationTool);
    case 'compare':
      return wrap(compareTool);
    case 'frieze':
      return wrap(friezeTool);
    case 'symmetry':
      return wrap(symmetryTool);
    case 'rotation':
      return wrap(rotationTool);
    case 'homothety':
      return wrap(homothetyTool);
    case 'text':
      return wrap(textTool);
  }
}
