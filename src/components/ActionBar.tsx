import { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  UI_PRIMARY,
  UI_SURFACE,
  UI_BG,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_DISABLED_BG,
  UI_DISABLED_TEXT,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '@/config/accessibility';
import { ACTION_UNDO, ACTION_REDO, ACTION_SCALE_NOTE } from '@/config/messages';
import {
  UndoIcon,
  RedoIcon,
  SettingsIcon,
  FullscreenIcon,
  ExitFullscreenIcon,
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
  readonly onStartTutorial?: () => void;
  readonly onShowAbout?: () => void;
  readonly onToggleDemoMode?: () => void;
  readonly demoMode?: boolean;
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
  onStartTutorial,
  onShowAbout,
  onToggleDemoMode,
  demoMode = false,
}: ActionBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 16px',
        background: UI_BG,
        fontSize: 13 * fontScale,
        borderTop: `1px solid ${UI_BORDER}`,
        gap: MIN_BUTTON_GAP_PX,
        flexShrink: 0,
      }}
      data-testid="action-bar"
      data-hide-labels={fontScale >= 1.25 ? 'true' : undefined}
    >
      {/* Undo */}
      <ActionBtn
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={ACTION_UNDO}
        title={ACTION_UNDO}
        data-testid="action-undo"
      >
        <UndoIcon /> <span className="action-label">{ACTION_UNDO}</span>
      </ActionBtn>

      {/* Redo */}
      <ActionBtn
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={ACTION_REDO}
        title={ACTION_REDO}
        data-testid="action-redo"
      >
        <RedoIcon /> <span className="action-label">{ACTION_REDO}</span>
      </ActionBtn>

      {/* Estimation mode: Vérifier button */}
      {estimationMode && onToggleEstimation && (
        <>
          <Separator />
          <ActionBtn
            onClick={onToggleEstimation}
            active
            aria-label="Vérifier les mesures"
            title="Vérifier les mesures"
          >
            Vérifier
          </ActionBtn>
        </>
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
        <ActionBtn
          onClick={onShowSlotManager}
          aria-label="Mes constructions"
          title="Mes constructions"
          data-testid="slot-manager-btn"
        >
          <FolderIcon /> <span className="action-label">Mes constructions</span>
        </ActionBtn>
      )}

      {/* Share menu popup (PDF + Lien & QR) */}
      <ShareMenu onPrint={onPrint} onShareLink={onShareLink} />

      <Separator />

      {/* ─ Right group: Settings, Aide, Fullscreen (round buttons) ─ */}

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

      {/* Aide — dropdown menu */}
      {!demoMode && onStartTutorial && (
        <HelpMenu onStartTutorial={onStartTutorial} onShowAbout={onShowAbout} />
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

/* ── Reusable ActionBtn ──────────────────────────────────── */

function ActionBtn({
  children,
  onClick,
  disabled,
  active,
  title,
  'aria-label': ariaLabel,
  'data-testid': testId,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        minWidth: MIN_BUTTON_SIZE_PX,
        minHeight: MIN_BUTTON_SIZE_PX,
        padding: '4px 10px',
        border: `2px solid ${disabled ? UI_DISABLED_BG : active ? UI_PRIMARY : UI_BORDER}`,
        borderRadius: 6,
        background: active ? '#E8F0FA' : disabled ? UI_DISABLED_BG : UI_SURFACE,
        color: active ? UI_PRIMARY : disabled ? UI_DISABLED_TEXT : UI_TEXT_PRIMARY,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 'inherit',
        fontWeight: active ? 600 : 'normal',
        opacity: disabled ? 0.5 : 1,
      }}
      aria-label={ariaLabel}
      title={title}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

/* ── Separator ───────────────────────────────────────────── */

function Separator() {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: UI_BORDER,
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  );
}

/* ── HelpMenu dropdown ───────────────────────────────────── */

function HelpMenu({
  onStartTutorial,
  onShowAbout,
}: {
  onStartTutorial: () => void;
  onShowAbout?: () => void;
}) {
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
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
        aria-haspopup="true"
        aria-expanded={open}
        data-testid="help-tutorial"
      >
        ?
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 8,
            background: '#fff',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 50,
            minWidth: 200,
          }}
          role="menu"
        >
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
                <circle cx="7" cy="7" r="5.5" />
                <path d="M5 5.5a2 2 0 013.5 1c0 1-1.5 1.2-1.5 2.2M7 10.5v.01" />
              </svg>
            }
            label="Tutoriel"
            testId="help-start-tutorial"
            onClick={() => {
              onStartTutorial();
              close();
            }}
          />
          <div style={{ height: 1, background: UI_BORDER, margin: '2px 8px' }} />
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
                <path d="M2 2h10v10H2zM2 5h10" />
              </svg>
            }
            label="Documentation"
            onClick={() => {
              window.open('https://geomolo.ca/docs/', '_blank');
              close();
            }}
          />
          {onShowAbout && (
            <>
              <div style={{ height: 1, background: UI_BORDER, margin: '2px 8px' }} />
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
                    <circle cx="7" cy="7" r="5.5" />
                    <path d="M7 6v3.5M7 4.5v.01" />
                  </svg>
                }
                label="À propos"
                onClick={() => {
                  onShowAbout();
                  close();
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Share popup menu ────────────────────────────────────── */

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
      <ActionBtn
        onClick={() => setOpen(!open)}
        aria-label="Partager"
        title="Partager"
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
      </ActionBtn>
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

/* ── Shared menu row ─────────────────────────────────────── */

function ShareRow({
  icon,
  label,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
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
      role="menuitem"
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
