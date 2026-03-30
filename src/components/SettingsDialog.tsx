/**
 * Settings dialog — spec §13.3, §7.1, §7.2, §6.1, §14.
 * Accessible via ⚙️ button in header.
 */

import { memo, useEffect } from 'react';
import type { ToleranceProfile, ChainTimeout, FontScale, SoundMode } from '@/model/types';
import { UI_PRIMARY, UI_SURFACE, UI_BORDER, UI_TEXT_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

interface SettingsDialogProps {
  readonly toleranceProfile: ToleranceProfile;
  readonly chainTimeoutMs: ChainTimeout;
  readonly fontScale: FontScale;
  readonly soundMode: SoundMode;
  readonly soundGain: number;
  readonly keyboardShortcutsEnabled: boolean;
  readonly pointToolVisible: boolean;
  readonly onToleranceChange: (v: ToleranceProfile) => void;
  readonly onChainTimeoutChange: (v: ChainTimeout) => void;
  readonly onFontScaleChange: (v: FontScale) => void;
  readonly onSoundModeChange: (v: SoundMode) => void;
  readonly onSoundGainChange: (v: number) => void;
  readonly onKeyboardShortcutsChange: (v: boolean) => void;
  readonly onPointToolVisibleChange: (v: boolean) => void;
  readonly onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: UI_SURFACE,
  borderRadius: 8,
  padding: 24,
  width: 360,
  maxHeight: '80vh',
  overflowY: 'auto',
  border: `1px solid ${UI_BORDER}`,
  color: UI_TEXT_PRIMARY,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: `1px solid ${UI_BORDER}`,
};

const selectStyle: React.CSSProperties = {
  minHeight: MIN_BUTTON_SIZE_PX,
  padding: '4px 8px',
  borderRadius: 4,
  border: `1px solid ${UI_BORDER}`,
  fontSize: 13,
  background: UI_SURFACE,
};

export const SettingsDialog = memo(function SettingsDialog({
  toleranceProfile,
  chainTimeoutMs,
  fontScale,
  soundMode,
  soundGain,
  keyboardShortcutsEnabled,
  pointToolVisible,
  onToleranceChange,
  onChainTimeoutChange,
  onFontScaleChange,
  onSoundModeChange,
  onSoundGainChange,
  onKeyboardShortcutsChange,
  onPointToolVisibleChange,
  onClose,
}: SettingsDialogProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  return (
    <div style={overlayStyle} onClick={onClose} data-testid="settings-dialog">
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <strong style={{ fontSize: 16 }}>Paramètres</strong>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: '#666',
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Tolerance profile */}
        <div style={rowStyle}>
          <span>Tolérance de l'aimant</span>
          <select
            value={toleranceProfile}
            onChange={(e) => onToleranceChange(e.target.value as ToleranceProfile)}
            style={selectStyle}
          >
            <option value="default">Standard</option>
            <option value="large">Large (×1,5)</option>
            <option value="very_large">Très large (×2)</option>
          </select>
        </div>

        {/* Chain timeout */}
        <div style={rowStyle}>
          <span>Temps de chaînage</span>
          <select
            value={chainTimeoutMs}
            onChange={(e) => onChainTimeoutChange(Number(e.target.value) as ChainTimeout)}
            style={selectStyle}
          >
            <option value={5000}>5 secondes</option>
            <option value={8000}>8 secondes</option>
            <option value={15000}>15 secondes</option>
            <option value={0}>Désactivé</option>
          </select>
        </div>

        {/* Font scale */}
        <div style={rowStyle}>
          <span>Taille du texte</span>
          <select
            value={fontScale}
            onChange={(e) => onFontScaleChange(Number(e.target.value) as FontScale)}
            style={selectStyle}
          >
            <option value={1}>Normal (1×)</option>
            <option value={1.25}>Grand (1,25×)</option>
            <option value={1.5}>Très grand (1,5×)</option>
          </select>
        </div>

        {/* Sound mode */}
        <div style={rowStyle}>
          <span>Sons</span>
          <select
            value={soundMode}
            onChange={(e) => onSoundModeChange(e.target.value as SoundMode)}
            style={selectStyle}
          >
            <option value="off">Désactivés</option>
            <option value="reduced">Réduits</option>
            <option value="full">Complets</option>
          </select>
        </div>

        {/* Sound gain (only if sound is on) */}
        {soundMode !== 'off' && (
          <div style={rowStyle}>
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={soundGain}
              onChange={(e) => onSoundGainChange(Number(e.target.value))}
              style={{ width: 120 }}
            />
          </div>
        )}

        {/* Keyboard shortcuts toggle */}
        <div style={rowStyle}>
          <span>Raccourcis clavier (lettres)</span>
          <input
            type="checkbox"
            checked={keyboardShortcutsEnabled}
            onChange={(e) => onKeyboardShortcutsChange(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
        </div>

        {/* Point tool visible toggle */}
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span>Outil Point (visible)</span>
          <input
            type="checkbox"
            checked={pointToolVisible}
            onChange={(e) => onPointToolVisibleChange(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '8px 0',
            background: UI_PRIMARY,
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
});
