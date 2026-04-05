/**
 * Text tool — place free-form text boxes on the canvas.
 * Flow: click canvas → create TextBox → open inline editor → commit text.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ConstructionState } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestTextBox } from '@/engine/hit-test';

interface UseTextToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  isActive?: boolean;
}

export function useTextTool({
  state,
  dispatch,
  isActive = true,
}: UseTextToolOptions): ToolHookResult & {
  editingId: string | null;
  startEditing: (id: string) => void;
  commitEdit: (text: string) => void;
  cancelEdit: () => void;
} {
  const [editingId, setEditingId] = useState<string | null>(null);
  const pendingEditRef = useRef(false);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive || editingId) return;
      // Check if clicking an existing textbox → edit it
      const hitId = hitTestTextBox(mmPos, state.textBoxes);
      if (hitId) {
        setEditingId(hitId);
        return;
      }
      // Otherwise create a new textbox
      dispatch({ type: 'CREATE_TEXT_BOX', x: mmPos.x, y: mmPos.y });
      pendingEditRef.current = true;
    },
    [isActive, dispatch, editingId, state.textBoxes],
  );

  // Auto-edit newly created empty textbox
  useEffect(() => {
    if (!pendingEditRef.current || !isActive) return;
    const emptyTb = state.textBoxes.find((tb) => tb.text === '');
    if (emptyTb) {
      setEditingId(emptyTb.id);
      pendingEditRef.current = false;
    }
  }, [state.textBoxes, isActive]);

  const commitEdit = useCallback(
    (text: string) => {
      if (!editingId) return;
      if (text) {
        dispatch({ type: 'UPDATE_TEXT_BOX', id: editingId, text });
      } else {
        dispatch({ type: 'DELETE_TEXT_BOX', id: editingId });
      }
      setEditingId(null);
    },
    [editingId, dispatch],
  );

  const cancelEdit = useCallback(() => {
    if (!editingId) return;
    const tb = state.textBoxes.find((t) => t.id === editingId);
    if (tb && !tb.text) {
      dispatch({ type: 'DELETE_TEXT_BOX', id: editingId });
    }
    setEditingId(null);
  }, [editingId, state.textBoxes, dispatch]);

  const startEditing = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const handleCursorMove = useCallback(() => {}, []);

  const handleEscape = useCallback(() => {
    if (editingId) cancelEdit();
  }, [editingId, cancelEdit]);

  const reset = useCallback(() => {
    if (editingId) cancelEdit();
  }, [editingId, cancelEdit]);

  return useMemo(
    () => ({
      handleClick,
      handleCursorMove,
      handleEscape,
      reset,
      isIdle: editingId === null,
      statusMessage: editingId
        ? 'Texte — Écris ton texte. Enter pour confirmer.'
        : 'Texte — Clique sur la grille pour placer une zone de texte',
      snapResult: null,
      overlayElements: null,
      editingId,
      startEditing,
      commitEdit,
      cancelEdit,
    }),
    [
      handleClick,
      handleCursorMove,
      handleEscape,
      reset,
      editingId,
      startEditing,
      commitEdit,
      cancelEdit,
    ],
  );
}
