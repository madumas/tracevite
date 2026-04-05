/**
 * Settings dialog — spec §13.3, §7.1, §7.2, §6.1, §14.
 * Accessible via ⚙️ button in header.
 */

import { memo, useEffect, useState } from 'react';
import type {
  ToleranceProfile,
  ChainTimeout,
  FontScale,
  SoundMode,
  GridSize,
  DisplayUnit,
} from '@/model/types';
import {
  UI_PRIMARY,
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import { usePreferences, useUpdatePreference, type SegmentColor } from '@/model/preferences';
import { AccordionSection } from './AccordionSection';

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
  readonly snapEnabled: boolean;
  readonly onSnapToggle: () => void;
  readonly gridSizeMm: GridSize;
  readonly onGridChange: (size: GridSize) => void;
  readonly displayUnit: DisplayUnit;
  readonly onUnitChange: (unit: DisplayUnit) => void;
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
  snapEnabled,
  onSnapToggle,
  gridSizeMm,
  onGridChange,
  displayUnit,
  onUnitChange,
  displayMode,
  onClose,
}: SettingsDialogProps) {
  const prefs = usePreferences();
  const updatePref = useUpdatePreference();
  const [activeProfile, setActiveProfile] = useState('');
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

        {/* ── Quick profile selector ──────────────────── */}
        <div style={rowStyle}>
          <span>Profil rapide</span>
          <select
            style={selectStyle}
            value={activeProfile}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'standard') {
                if (!snapEnabled) onSnapToggle();
                onGridChange(5);
                onUnitChange('cm');
                onToleranceChange('default');
                onFontScaleChange(1);
                onChainTimeoutChange(8000);
                onSoundModeChange('reduced');
                setActiveProfile('standard');
              } else if (v === 'accrue') {
                if (!snapEnabled) onSnapToggle();
                onGridChange(10);
                onUnitChange('cm');
                onToleranceChange('large');
                onFontScaleChange(1.25);
                onChainTimeoutChange(8000);
                onSoundModeChange('reduced');
                setActiveProfile('accrue');
              } else if (v === 'maximale') {
                if (!snapEnabled) onSnapToggle();
                onGridChange(20);
                onUnitChange('cm');
                onToleranceChange('very_large');
                onFontScaleChange(1.5);
                onChainTimeoutChange(15000);
                onSoundModeChange('reduced');
                updatePref('highContrast', true);
                updatePref('fatigueReminderMinutes', 15);
                setActiveProfile('maximale');
              }
            }}
          >
            <option value="">Choisir…</option>
            <option value="standard">Standard</option>
            <option value="accrue">Accessibilité accrue</option>
            <option value="maximale">Accessibilité maximale</option>
          </select>
        </div>

        {/* ── Section: Mes préférences ──────────────────── */}
        <div style={{ height: 1, background: UI_BORDER, margin: '8px 0' }} />
        <div
          style={{
            padding: '4px 0 4px',
            fontSize: 11,
            fontWeight: 700,
            color: UI_TEXT_SECONDARY,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Mes préférences
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
              { color: '#0a7e7a' as SegmentColor, name: 'Turquoise' },
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
        <div style={{ height: 1, background: UI_BORDER, margin: '8px 0' }} />
        <div
          style={{
            padding: '4px 0 4px',
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

        {/* ── Sub-section: Visuel ──── */}
        <div
          style={{ fontSize: 10, color: UI_TEXT_SECONDARY, padding: '6px 0 2px', fontWeight: 600 }}
        >
          Visuel
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

        {/* Animate transformations */}
        <div style={rowStyle}>
          <span>Animer les transformations</span>
          <input
            type="checkbox"
            checked={prefs.animateTransformations}
            onChange={(e) => updatePref('animateTransformations', e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
          />
        </div>

        {/* Focus mode */}
        <div style={rowStyle}>
          <span>Mode focus (atténuer les éléments éloignés)</span>
          <input
            type="checkbox"
            checked={prefs.focusMode}
            onChange={(e) => updatePref('focusMode', e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
          />
        </div>

        {/* Reinforced grid */}
        <div style={rowStyle}>
          <span>Grille renforcée</span>
          <input
            type="checkbox"
            checked={prefs.reinforcedGrid}
            onChange={(e) => updatePref('reinforcedGrid', e.target.checked)}
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

        {/* ── Section: Paramètres de classe (teacher-level) ──── */}
        <div style={{ marginTop: 12 }}>
          <AccordionSection title="🔒 Paramètres de classe">
            {prefs.lockedSettings.length > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: UI_TEXT_SECONDARY,
                  fontStyle: 'italic',
                  marginBottom: 8,
                }}
              >
                Choisi par ton enseignant(e)
              </div>
            )}

            {/* Grid size */}
            <div style={rowStyle}>
              <span>Taille de la grille</span>
              <select
                value={gridSizeMm}
                onChange={(e) => onGridChange(Number(e.target.value) as GridSize)}
                style={selectStyle}
                disabled={prefs.lockedSettings.includes('gridSizeMm')}
              >
                <option value={5}>5 mm</option>
                <option value={10}>1 cm</option>
                <option value={20}>2 cm</option>
              </select>
            </div>

            {/* Snap toggle */}
            <div style={rowStyle}>
              <span>Accrocher à la grille</span>
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={() => onSnapToggle()}
                disabled={prefs.lockedSettings.includes('snapEnabled')}
                style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
              />
            </div>

            {/* Display unit */}
            <div style={rowStyle}>
              <span>Unité d'affichage</span>
              <select
                value={displayUnit}
                onChange={(e) => onUnitChange(e.target.value as DisplayUnit)}
                style={selectStyle}
                disabled={prefs.lockedSettings.includes('displayUnit')}
              >
                <option value="cm">Centimètres (cm)</option>
                <option value="mm">Millimètres (mm)</option>
              </select>
            </div>

            {/* Tolerance profile */}
            <div style={rowStyle}>
              <span>Tolérance de l'aimant</span>
              <select
                value={toleranceProfile}
                onChange={(e) => onToleranceChange(e.target.value as ToleranceProfile)}
                style={selectStyle}
                disabled={prefs.lockedSettings.includes('toleranceProfile')}
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
                disabled={prefs.lockedSettings.includes('chainTimeoutMs')}
              >
                <option value={5000}>5 secondes</option>
                <option value={8000}>8 secondes</option>
                <option value={15000}>15 secondes</option>
                <option value={0}>Désactivé</option>
              </select>
            </div>

            {/* Keyboard shortcuts */}
            <div style={rowStyle}>
              <span>Raccourcis clavier</span>
              <input
                type="checkbox"
                checked={keyboardShortcutsEnabled}
                onChange={(e) => onKeyboardShortcutsChange(e.target.checked)}
                disabled={prefs.lockedSettings.includes('keyboardShortcutsEnabled')}
                style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
              />
            </div>

            {/* Estimation mode */}
            <div style={rowStyle}>
              <span>Mode estimation</span>
              <input
                type="checkbox"
                checked={estimationMode}
                onChange={(e) => onEstimationModeChange(e.target.checked)}
                disabled={prefs.lockedSettings.includes('estimationMode')}
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
                  disabled={prefs.lockedSettings.includes('cartesianMode')}
                >
                  <option value="off">Désactivé</option>
                  <option value="1quadrant">1er quadrant</option>
                  <option value="4quadrants">4 quadrants</option>
                </select>
              </div>
            )}

            {/* Auto-intersection */}
            <div style={rowStyle}>
              <span>Intersections automatiques</span>
              <input
                type="checkbox"
                checked={autoIntersection}
                onChange={(e) => onAutoIntersectionChange(e.target.checked)}
                disabled={prefs.lockedSettings.includes('autoIntersection')}
                style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
              />
            </div>

            {/* Clutter threshold */}
            <div style={rowStyle}>
              <span>Seuil de surcharge</span>
              <select
                value={clutterThreshold}
                onChange={(e) => onClutterThresholdChange(Number(e.target.value))}
                style={{ height: MIN_BUTTON_SIZE_PX - 8, fontSize: 'inherit', cursor: 'pointer' }}
                disabled={prefs.lockedSettings.includes('clutterThreshold')}
              >
                <option value={0}>Normal ({displayMode === 'simplifie' ? 5 : 6})</option>
                <option value={3}>3 segments</option>
                <option value={5}>5 segments</option>
                <option value={8}>8 segments</option>
                <option value={999}>Toujours afficher</option>
              </select>
            </div>

            {/* Point tool visible */}
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span>Outil Point (visible)</span>
              <input
                type="checkbox"
                checked={pointToolVisible}
                onChange={(e) => onPointToolVisibleChange(e.target.checked)}
                disabled={prefs.lockedSettings.includes('pointToolVisible')}
                style={{ width: 20, height: 20, cursor: 'pointer', minWidth: 44, minHeight: 44 }}
              />
            </div>
          </AccordionSection>
        </div>

        <button
          onClick={() => {
            const locked = prefs.lockedSettings;
            if (!locked.includes('snapEnabled') && !snapEnabled) onSnapToggle();
            if (!locked.includes('gridSizeMm')) onGridChange(5);
            if (!locked.includes('displayUnit')) onUnitChange('cm');
            if (!locked.includes('toleranceProfile')) onToleranceChange('default');
            if (!locked.includes('chainTimeoutMs')) onChainTimeoutChange(8000);
            onFontScaleChange(1);
            onSoundModeChange('reduced');
            onSoundGainChange(0.5);
            if (!locked.includes('keyboardShortcutsEnabled')) onKeyboardShortcutsChange(false);
            if (!locked.includes('pointToolVisible')) onPointToolVisibleChange(false);
            if (!locked.includes('estimationMode')) onEstimationModeChange(false);
            if (!locked.includes('cartesianMode')) onCartesianModeChange('off');
            if (!locked.includes('autoIntersection')) onAutoIntersectionChange(true);
            if (!locked.includes('clutterThreshold')) onClutterThresholdChange(0);
          }}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '8px 0',
            background: 'transparent',
            color: UI_TEXT_SECONDARY,
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Réinitialiser les paramètres
        </button>
        <button
          onClick={onClose}
          style={{
            marginTop: 8,
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
