import { useState, useRef, useEffect, useCallback } from 'react';
import { UI_SURFACE, UI_BORDER, UI_TEXT_PRIMARY, UI_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import { RADIUS_PLACEHOLDER } from '@/config/messages';
import { parseFrenchNumber } from '@/engine/format';
import type { DisplayUnit } from '@/model/types';

interface RadiusInputProps {
  readonly circleLabel: string;
  readonly currentRadiusMm: number;
  readonly displayUnit: DisplayUnit;
  readonly onSubmit: (radiusMm: number) => void;
  readonly onDismiss: () => void;
}

/**
 * Inline radius/diameter input field for circles (spec §6.3).
 * Toggle between Rayon and Diametre modes.
 * Enter confirms, Escape/click elsewhere dismisses.
 */
export function RadiusInput({
  circleLabel,
  currentRadiusMm: _currentRadiusMm,
  displayUnit,
  onSubmit,
  onDismiss,
}: RadiusInputProps) {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'rayon' | 'diametre'>('rayon');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Detect virtual keyboard via visualViewport (spec §21.1)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const ratio = vv.height / window.innerHeight;
      setKeyboardVisible(ratio < 0.7);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  // Dismiss on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 200);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onDismiss]);

  const handleSubmit = useCallback(() => {
    const parsed = parseFrenchNumber(value);
    if (parsed !== null && parsed > 0) {
      const mm = displayUnit === 'cm' ? parsed * 10 : parsed;
      const radiusMm = mode === 'diametre' ? mm / 2 : mm;
      onSubmit(radiusMm);
    }
    onDismiss();
  }, [value, displayUnit, mode, onSubmit, onDismiss]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    },
    [handleSubmit, onDismiss],
  );

  const label =
    mode === 'rayon' ? `Rayon du cercle ${circleLabel} :` : `Diamètre du cercle ${circleLabel} :`;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        ...(keyboardVisible ? { top: 80 } : { bottom: 60 }),
        left: '50%',
        transform: 'translateX(-50%)',
        background: UI_SURFACE,
        border: `1px solid ${UI_BORDER}`,
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 20,
      }}
      data-testid="radius-input"
    >
      <label style={{ fontSize: 12, color: UI_TEXT_PRIMARY }}>{label}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          onClick={() => setMode((m) => (m === 'rayon' ? 'diametre' : 'rayon'))}
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX - 8,
            padding: '4px 8px',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            background: UI_PRIMARY,
            color: '#FFF',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
          aria-label={mode === 'rayon' ? 'Passer au diamètre' : 'Passer au rayon'}
          data-testid="radius-mode-toggle"
        >
          {mode === 'rayon' ? 'Rayon' : 'Diamètre'}
        </button>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={RADIUS_PLACEHOLDER}
          style={{
            width: 120,
            height: MIN_BUTTON_SIZE_PX - 8,
            padding: '4px 8px',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            fontSize: 14,
            outline: 'none',
          }}
          data-testid="radius-input-field"
        />
        <span style={{ fontSize: 13, color: UI_TEXT_PRIMARY }}>{displayUnit}</span>
      </div>
    </div>
  );
}
