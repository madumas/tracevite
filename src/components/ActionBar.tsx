import { memo } from 'react';
import {
  ACTION_BAR_HEIGHT,
  UI_PRIMARY,
  UI_DESTRUCTIVE,
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_DISABLED_BG,
  UI_DISABLED_TEXT,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '@/config/accessibility';
import {
  ACTION_UNDO,
  ACTION_REDO,
  ACTION_DELETE,
  ACTION_PRINT,
  ACTION_NEW,
  ACTION_SCALE_NOTE,
} from '@/config/messages';

interface ActionBarProps {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canPrint: boolean;
  readonly deleteMode?: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onToggleDeleteMode?: () => void;
  readonly onPrint: () => void;
  readonly onNewConstruction: () => void;
}

export const ActionBar = memo(function ActionBar({
  canUndo,
  canRedo,
  canPrint,
  deleteMode,
  onUndo,
  onRedo,
  onToggleDeleteMode,
  onPrint,
  onNewConstruction,
}: ActionBarProps) {
  return (
    <div
      style={{
        height: ACTION_BAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        background: UI_SURFACE,
        borderTop: `1px solid ${UI_BORDER}`,
        gap: MIN_BUTTON_GAP_PX,
      }}
      data-testid="action-bar"
    >
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX - 8,
          padding: '0 10px',
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          background: canUndo ? '#E8F0FA' : UI_DISABLED_BG,
          color: canUndo ? UI_TEXT_PRIMARY : UI_DISABLED_TEXT,
          cursor: canUndo ? 'pointer' : 'default',
          fontSize: 13,
        }}
        aria-label={ACTION_UNDO}
        data-testid="action-undo"
      >
        ↩ {ACTION_UNDO}
      </button>

      {/* Redo */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX - 8,
          padding: '0 10px',
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          background: canRedo ? UI_SURFACE : UI_DISABLED_BG,
          color: canRedo ? UI_TEXT_PRIMARY : UI_DISABLED_TEXT,
          cursor: canRedo ? 'pointer' : 'default',
          fontSize: 13,
        }}
        aria-label={ACTION_REDO}
        data-testid="action-redo"
      >
        ↪ {ACTION_REDO}
      </button>

      {/* Delete mode toggle */}
      <button
        onClick={onToggleDeleteMode}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX - 8,
          padding: '0 10px',
          border: `1px solid ${deleteMode ? UI_DESTRUCTIVE : UI_BORDER}`,
          borderRadius: 4,
          background: deleteMode ? UI_DESTRUCTIVE : UI_SURFACE,
          color: deleteMode ? '#FFFFFF' : UI_TEXT_PRIMARY,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: deleteMode ? 600 : 400,
        }}
        aria-label={ACTION_DELETE}
        aria-pressed={deleteMode}
        data-testid="action-delete"
      >
        🗑 {ACTION_DELETE}
      </button>

      {/* Spacer */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{ACTION_SCALE_NOTE}</span>
      </div>

      {/* Print */}
      <button
        onClick={onPrint}
        disabled={!canPrint}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX - 8,
          padding: '0 14px',
          border: 'none',
          borderRadius: 4,
          background: canPrint ? UI_PRIMARY : UI_DISABLED_BG,
          color: canPrint ? '#FFFFFF' : UI_DISABLED_TEXT,
          cursor: canPrint ? 'pointer' : 'default',
          fontSize: 13,
          fontWeight: 500,
        }}
        aria-label={ACTION_PRINT}
        data-testid="action-print"
      >
        {ACTION_PRINT}
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 8px' }} />

      {/* New construction — red, far right, isolated */}
      <button
        onClick={onNewConstruction}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX - 8,
          padding: '0 14px',
          border: 'none',
          borderRadius: 4,
          background: UI_DESTRUCTIVE,
          color: '#FFFFFF',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
        data-testid="action-new"
      >
        {ACTION_NEW}
      </button>
    </div>
  );
});
