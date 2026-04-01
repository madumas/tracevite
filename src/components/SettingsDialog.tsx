/**
 * Settings dialog — spec §13.3, §7.1, §7.2, §6.1, §14.
 * Accessible via ⚙️ button in header.
 */

import { memo, useEffect } from 'react';
import type { ToleranceProfile, ChainTimeout, FontScale, SoundMode } from '@/model/types';
import {
  UI_PRIMARY,
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import { usePreferences, useUpdatePreference, type SegmentColor } from '@/model/preferences';

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
  readonly estimationMode: boolean;
  readonly onEstimationModeChange: (v: boolean) => void;
  readonly cartesianMode: import('@/model/types').CartesianMode;
  readonly onCartesianModeChange: (v: import('@/model/types').CartesianMode) => void;
  readonly autoIntersection: boolean;
  readonly onAutoIntersectionChange: (v: boolean) => void;
  readonly clutterThreshold: number;
  readonly onClutterThresholdChange: (v: number) => void;
  readonly displayMode: import('@/model/types').DisplayMode;
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
  estimationMode,
  onEstimationModeChange,
  cartesianMode,
  onCartesianModeChange,
  autoIntersection,
  onAutoIntersectionChange,
  clutterThreshold,
  onClutterThresholdChange,
  displayMode,
  onClose,
}: SettingsDialogProps) {
  const prefs = usePreferences();
  const updatePref = useUpdatePreference();
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

        {/* ── Section: Interaction ──────────────────────── */}
        <div
          style={{
            padding: '12px 0 4px',
            fontSize: 11,
            fontWeight: 700,
            color: UI_TEXT_SECONDARY,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Interaction
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

        {/* ── Section: Affichage ──────────────────────── */}
        <div
          style={{
            padding: '12px 0 4px',
            fontSize: 11,
            fontWeight: 700,
            color: UI_TEXT_SECONDARY,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Affichage
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
            style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
          />
        </div>

        {/* Panel position */}
        <div style={rowStyle}>
          <span>Panneau latéral</span>
          <select
            value={prefs.panelPosition}
            onChange={(e) => updatePref('panelPosition', e.target.value as 'left' | 'right')}
            style={selectStyle}
          >
            <option value="right">À droite</option>
            <option value="left">À gauche</option>
          </select>
        </div>

        {/* Segment color */}
        <div style={rowStyle}>
          <span>Couleur des traits</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { color: '#185FA5' as SegmentColor, name: 'Bleu' },
              { color: '#0F6E56' as SegmentColor, name: 'Vert' },
              { color: '#6D28D9' as SegmentColor, name: 'Violet' },
              { color: '#C24B22' as SegmentColor, name: 'Orange' },
            ].map(({ color, name }) => (
              <button
                key={color}
                onClick={() => updatePref('segmentColor', color)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: color,
                  border: prefs.segmentColor === color ? '3px solid #1A2433' : '2px solid #D1D8E0',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label={name}
              />
            ))}
          </div>
        </div>

        {/* ── Section: Accessibilité ──────────────────── */}
        <div
          style={{
            padding: '12px 0 4px',
            fontSize: 11,
            fontWeight: 700,
            color: UI_TEXT_SECONDARY,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Accessibilité
        </div>

        {/* Fatigue reminder */}
        <div style={rowStyle}>
          <span>Rappel de pause</span>
          <select
            value={prefs.fatigueReminderMinutes ?? 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              updatePref('fatigueReminderMinutes', v === 0 ? null : v);
            }}
            style={selectStyle}
          >
            <option value={0}>Désactivé</option>
            <option value={20}>20 minutes</option>
            <option value={25}>25 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </div>

        {/* Estimation mode toggle */}
        <div style={rowStyle}>
          <span>Mode estimation (mesures masquées)</span>
          <input
            type="checkbox"
            checked={estimationMode}
            onChange={(e) => onEstimationModeChange(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
          />
        </div>

        {/* Cartesian mode — complet only */}
        {displayMode === 'complet' && (
          <div style={rowStyle}>
            <span>Plan cartésien</span>
            <select
              value={cartesianMode}
              onChange={(e) =>
                onCartesianModeChange(e.target.value as import('@/model/types').CartesianMode)
              }
              style={selectStyle}
            >
              <option value="off">Désactivé</option>
              <option value="1quadrant">1er quadrant</option>
              <option value="4quadrants">4 quadrants</option>
            </select>
          </div>
        )}

        {/* Auto-intersection toggle */}
        <div style={rowStyle}>
          <span>Intersections automatiques</span>
          <input
            type="checkbox"
            checked={autoIntersection}
            onChange={(e) => onAutoIntersectionChange(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
          />
        </div>

        {/* Clutter threshold */}
        <div style={rowStyle}>
          <span>Seuil de surcharge visuelle</span>
          <select
            value={clutterThreshold}
            onChange={(e) => onClutterThresholdChange(Number(e.target.value))}
            style={{ height: MIN_BUTTON_SIZE_PX - 8, fontSize: 'inherit', cursor: 'pointer' }}
          >
            <option value={0}>Auto ({displayMode === 'simplifie' ? 5 : 6})</option>
            <option value={4}>4 segments</option>
            <option value={5}>5 segments</option>
            <option value={6}>6 segments</option>
            <option value={8}>8 segments</option>
            <option value={10}>10 segments</option>
            <option value={15}>15 segments</option>
            <option value={999}>Toujours afficher</option>
          </select>
        </div>

        {/* High contrast toggle */}
        <div style={rowStyle}>
          <span>Contraste élevé</span>
          <input
            type="checkbox"
            checked={prefs.highContrast}
            onChange={(e) => updatePref('highContrast', e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
          />
        </div>

        {/* Cursor smoothing — only when tolerance is very_large */}
        {toleranceProfile === 'very_large' && (
          <div style={rowStyle}>
            <span>Lissage du curseur</span>
            <input
              type="checkbox"
              checked={prefs.cursorSmoothing}
              onChange={(e) => updatePref('cursorSmoothing', e.target.checked)}
              style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
            />
          </div>
        )}

        {/* Point tool visible toggle */}
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span>Outil Point (visible)</span>
          <input
            type="checkbox"
            checked={pointToolVisible}
            onChange={(e) => onPointToolVisibleChange(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
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
