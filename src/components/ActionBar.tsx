import { memo, useState, useRef, useEffect } from 'react';
import type { GridSize, DisplayUnit } from '@/model/types';
import {
  ACTION_BAR_HEIGHT,
  UI_PRIMARY,
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
  ACTION_SCALE_NOTE,
  TOOL_SNAP,
  GRID_5MM,
  GRID_1CM,
  GRID_2CM,
} from '@/config/messages';
import {
  UndoIcon,
  RedoIcon,
  SettingsIcon,
  FullscreenIcon,
  ExitFullscreenIcon,
  SnapIconSmall,
  FolderIcon,
} from './ToolIcons';

interface ActionBarProps {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onPrint: () => void;
  readonly onShareLink: () => void;
  readonly fontScale?: number;
  readonly estimationMode?: boolean;
  readonly onToggleEstimation?: () => void;
  readonly onShowSlotManager?: () => void;
  readonly onShowSettings?: () => void;
  readonly onShowGuide?: () => void;
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
  onUndo,
  onRedo,
  onPrint,
  onShareLink,
  fontScale = 1,
  estimationMode = false,
  onToggleEstimation,
  onShowSlotManager,
  onShowSettings,
  onShowGuide,
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
      data-hide-labels={fontScale >= 1.25 ? 'true' : undefined}
    >
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX,
          padding: '0 10px',
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          background: canUndo ? '#E8F0FA' : UI_DISABLED_BG,
          color: canUndo ? UI_TEXT_PRIMARY : UI_DISABLED_TEXT,
          cursor: canUndo ? 'pointer' : 'default',
          fontSize: 'inherit',
        }}
        aria-label={ACTION_UNDO}
        title={ACTION_UNDO}
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
          height: MIN_BUTTON_SIZE_PX,
          padding: '0 10px',
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          background: canRedo ? UI_SURFACE : UI_DISABLED_BG,
          color: canRedo ? UI_TEXT_PRIMARY : UI_DISABLED_TEXT,
          cursor: canRedo ? 'pointer' : 'default',
          fontSize: 'inherit',
        }}
        aria-label={ACTION_REDO}
        title={ACTION_REDO}
        data-testid="action-redo"
      >
        <RedoIcon /> <span className="action-label">{ACTION_REDO}</span>
      </button>

      {/* ─ sep ─ */}
      <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />

      {/* Snap toggle */}
      <button
        onClick={onSnapToggle}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX,
          padding: '0 10px',
          border: `1px solid ${snapEnabled ? '#22C55E' : '#FCA5A5'}`,
          borderRadius: 4,
          background: snapEnabled ? UI_SURFACE : '#FFF5F5',
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
          data-testid="snap-indicator"
          style={{
            width: 8,
            height: 8,
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
      <div style={{ display: 'flex', gap: MIN_BUTTON_GAP_PX }}>
        {([5, 10, 20] as GridSize[]).map((size) => (
          <button
            key={size}
            onClick={() => onGridChange(size)}
            style={{
              minWidth: MIN_BUTTON_SIZE_PX,
              height: MIN_BUTTON_SIZE_PX,
              padding: '0 6px',
              border: gridSizeMm === size ? `1px solid ${UI_PRIMARY}` : `1px solid ${UI_BORDER}`,
              borderRadius: 4,
              background: gridSizeMm === size ? '#E8F0FA' : UI_SURFACE,
              color: UI_TEXT_PRIMARY,
              cursor: 'pointer',
              fontSize: 'inherit',
            }}
            aria-pressed={gridSizeMm === size}
            aria-label={`Grille ${size === 5 ? GRID_5MM : size === 10 ? GRID_1CM : GRID_2CM}`}
            title={`Grille ${size === 5 ? GRID_5MM : size === 10 ? GRID_1CM : GRID_2CM}`}
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
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX,
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
        aria-label={`Unité : ${displayUnit}`}
        title="Changer l'unité d'affichage des mesures"
      >
        Unité : {displayUnit}
      </button>

      {/* Estimation mode: Vérifier button */}
      {estimationMode && onToggleEstimation && (
        <button
          onClick={onToggleEstimation}
          aria-label="Vérifier les mesures"
          title="Vérifier les mesures"
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX,
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
            height: MIN_BUTTON_SIZE_PX,
            padding: '0 10px',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            background: UI_SURFACE,
            color: UI_TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: 'inherit',
          }}
          aria-label="Mes constructions"
          title="Mes constructions"
          data-testid="slot-manager-btn"
        >
          <FolderIcon /> <span className="action-label">Mes constructions</span>
        </button>
      )}

      {/* Share menu popup (PDF + Lien & QR) */}
      <ShareMenu onPrint={onPrint} onShareLink={onShareLink} />

      {/* ─ Right group: Settings, Aide, Fullscreen (round buttons like RésoMolo) ─ */}

      {/* Settings */}
      {!demoMode && onShowSettings && (
        <button
          onClick={onShowSettings}
          style={{
            width: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX,
            padding: 0,
            border: `1px solid ${UI_PRIMARY}`,
            borderRadius: '50%',
            background: 'none',
            color: UI_PRIMARY,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Paramètres"
          title="Paramètres"
          data-testid="settings-button"
        >
          <SettingsIcon />
        </button>
      )}

      {/* Aide */}
      {!demoMode && onShowGuide && (
        <button
          onClick={onShowGuide}
          style={{
            width: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX,
            padding: 0,
            border: `1px solid ${UI_PRIMARY}`,
            borderRadius: '50%',
            background: 'none',
            color: UI_PRIMARY,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
          }}
          aria-label="Aide"
          title="Aide"
          data-testid="help-tutorial"
        >
          ?
        </button>
      )}

      {/* Fullscreen/Demo */}
      {onToggleDemoMode && (
        <button
          onClick={onToggleDemoMode}
          style={{
            width: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX,
            padding: 0,
            border: demoMode ? 'none' : `1px solid ${UI_PRIMARY}`,
            borderRadius: '50%',
            background: demoMode ? UI_PRIMARY : 'none',
            color: demoMode ? '#FFF' : UI_PRIMARY,
            cursor: 'pointer',
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
    </div>
  );
});

/** Share popup menu — calqué sur ResoMolo */
function ShareMenu({ onPrint, onShareLink }: { onPrint: () => void; onShareLink: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX,
          padding: '0 10px',
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          background: UI_SURFACE,
          color: UI_TEXT_PRIMARY,
          cursor: 'pointer',
          fontSize: 'inherit',
        }}
        aria-label="Partager"
        title="Partager"
        aria-expanded={open}
        data-testid="action-share"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ verticalAlign: 'middle', marginRight: 4 }}
        >
          <path d="M2 8v4h10V8M7 1v8M4 4l3-3 3 3" />
        </svg>
        <span className="action-label">Partager</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            background: '#fff',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 20,
            minWidth: 180,
          }}
        >
          <ShareRow
            icon={<span style={{ fontSize: 13, fontWeight: 600 }}>PDF</span>}
            label="Imprimer (PDF)"
            onClick={() => {
              onPrint();
              setOpen(false);
            }}
          />
          <ShareRow
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 8a3 3 0 004 1l2-2a3 3 0 00-4-4L6 5M8 6a3 3 0 00-4-1L2 7a3 3 0 004 4l2-2" />
              </svg>
            }
            label="Lien & QR code"
            onClick={() => {
              onShareLink();
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ShareRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        minHeight: 48,
        background: 'none',
        border: 'none',
        borderRadius: 6,
        fontSize: 13,
        color: UI_PRIMARY,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
      onPointerEnter={(e) => {
        (e.target as HTMLElement).style.background = '#E0F2F1';
      }}
      onPointerLeave={(e) => {
        (e.target as HTMLElement).style.background = 'none';
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
