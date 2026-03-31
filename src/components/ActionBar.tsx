import { memo } from 'react';
import type { GridSize, DisplayUnit } from '@/model/types';
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
  TOOL_SNAP,
  GRID_5MM,
  GRID_1CM,
  GRID_2CM,
} from '@/config/messages';
import {
  UndoIcon,
  RedoIcon,
  DeleteIcon,
  PrintIcon,
  NewIcon,
  SettingsIcon,
  FullscreenIcon,
  ExitFullscreenIcon,
  SnapIconSmall,
  FolderIcon,
} from './ToolIcons';

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
  readonly fontScale?: number;
  readonly estimationMode?: boolean;
  readonly onToggleEstimation?: () => void;
  readonly onShowSlotManager?: () => void;
  readonly onShowSettings?: () => void;
  readonly onToggleDemoMode?: () => void;
  readonly demoMode?: boolean;
  readonly snapEnabled: boolean;
  readonly onSnapToggle: () => void;
  readonly gridSizeMm: GridSize;
  readonly onGridChange: (size: GridSize) => void;
  readonly displayUnit: DisplayUnit;
  readonly onUnitChange: (unit: DisplayUnit) => void;
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
  fontScale = 1,
  estimationMode = false,
  onToggleEstimation,
  onShowSlotManager,
  onShowSettings,
  onToggleDemoMode,
  demoMode = false,
  snapEnabled,
  onSnapToggle,
  gridSizeMm,
  onGridChange,
  displayUnit,
  onUnitChange,
}: ActionBarProps) {
  return (
    <div
      style={{
        height: ACTION_BAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        background: UI_SURFACE,
        fontSize: 13 * fontScale,
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
          fontSize: 'inherit',
        }}
        aria-label={ACTION_UNDO}
        data-testid="action-undo"
      >
        <UndoIcon /> <span className="action-label">{ACTION_UNDO}</span>
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
          fontSize: 'inherit',
        }}
        aria-label={ACTION_REDO}
        data-testid="action-redo"
      >
        <RedoIcon /> <span className="action-label">{ACTION_REDO}</span>
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
          fontSize: 'inherit',
          fontWeight: deleteMode ? 600 : 400,
        }}
        aria-label={ACTION_DELETE}
        aria-pressed={deleteMode}
        data-testid="action-delete"
      >
        <DeleteIcon /> <span className="action-label">{ACTION_DELETE}</span>
      </button>

      {/* ─ sep ─ */}
      <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />

      {/* Snap toggle */}
      <button
        onClick={onSnapToggle}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX - 8,
          padding: '0 10px',
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          background: UI_SURFACE,
          color: snapEnabled ? UI_PRIMARY : UI_DISABLED_TEXT,
          cursor: 'pointer',
          fontSize: 'inherit',
          fontWeight: snapEnabled ? 600 : 400,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
        aria-pressed={snapEnabled}
        data-testid="snap-toggle"
        title={snapEnabled ? 'Aimant activé' : 'Aimant désactivé'}
      >
        <SnapIconSmall /> <span className="action-label">{TOOL_SNAP}</span>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: snapEnabled ? '#22C55E' : '#D1D8E0',
            display: 'inline-block',
          }}
        />
      </button>

      {/* Grid selector */}
      <span
        className="action-label"
        style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}
      >
        Grille
      </span>
      <div style={{ display: 'flex', gap: 2 }}>
        {([5, 10, 20] as GridSize[]).map((size) => (
          <button
            key={size}
            onClick={() => onGridChange(size)}
            style={{
              minWidth: 36,
              height: MIN_BUTTON_SIZE_PX - 8,
              padding: '0 6px',
              border: gridSizeMm === size ? `1px solid ${UI_PRIMARY}` : `1px solid ${UI_BORDER}`,
              borderRadius: 4,
              background: gridSizeMm === size ? '#E8F0FA' : UI_SURFACE,
              color: UI_TEXT_PRIMARY,
              cursor: 'pointer',
              fontSize: 'inherit',
            }}
            aria-pressed={gridSizeMm === size}
            data-testid={`grid-${size}`}
          >
            {size === 5 ? GRID_5MM : size === 10 ? GRID_1CM : GRID_2CM}
          </button>
        ))}
      </div>

      {/* ─ sep ─ */}
      <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />

      {/* Unit toggle */}
      <button
        onClick={() => onUnitChange(displayUnit === 'cm' ? 'mm' : 'cm')}
        style={{
          minWidth: 36,
          height: MIN_BUTTON_SIZE_PX - 8,
          padding: '0 8px',
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          background: UI_SURFACE,
          color: UI_TEXT_PRIMARY,
          cursor: 'pointer',
          fontSize: 'inherit',
          whiteSpace: 'nowrap',
        }}
        data-testid="unit-toggle"
        title="Changer l'unité d'affichage des mesures"
      >
        Unité : {displayUnit}
      </button>

      {/* Estimation mode: Vérifier button */}
      {estimationMode && onToggleEstimation && (
        <button
          onClick={onToggleEstimation}
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX - 8,
            padding: '0 10px',
            border: `1px solid ${UI_PRIMARY}`,
            borderRadius: 4,
            background: '#E8F0FA',
            color: UI_PRIMARY,
            cursor: 'pointer',
            fontSize: 'inherit',
            fontWeight: 600,
          }}
        >
          Vérifier
        </button>
      )}

      {/* Spacer */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <span
          className="action-label"
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {ACTION_SCALE_NOTE}
        </span>
      </div>

      {/* Mes constructions */}
      {!demoMode && onShowSlotManager && (
        <button
          onClick={onShowSlotManager}
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX - 8,
            padding: '0 10px',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            background: UI_SURFACE,
            color: UI_TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: 'inherit',
          }}
          aria-label="Mes constructions"
          data-testid="slot-manager-btn"
        >
          <FolderIcon /> <span className="action-label">Mes constructions</span>
        </button>
      )}

      {/* Settings */}
      {!demoMode && onShowSettings && (
        <button
          onClick={onShowSettings}
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX - 8,
            padding: 0,
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            color: UI_TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Paramètres"
          data-testid="settings-button"
        >
          <SettingsIcon />
        </button>
      )}

      {/* Fullscreen/Demo */}
      {onToggleDemoMode && (
        <button
          onClick={onToggleDemoMode}
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX - 8,
            padding: 0,
            border: 'none',
            borderRadius: 4,
            background: demoMode ? UI_PRIMARY : 'transparent',
            color: demoMode ? '#FFF' : UI_TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Mode démonstration"
          title="Mode démonstration (plein écran)"
          data-testid="demo-toggle"
        >
          {demoMode ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      )}

      {/* ─ sep ─ */}
      <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />

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
          fontSize: 'inherit',
          fontWeight: 500,
        }}
        aria-label={ACTION_PRINT}
        data-testid="action-print"
      >
        <PrintIcon /> <span className="action-label">{ACTION_PRINT}</span>
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />

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
          fontSize: 'inherit',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
        data-testid="action-new"
      >
        <NewIcon /> <span className="action-label">{ACTION_NEW}</span>
      </button>
    </div>
  );
});
