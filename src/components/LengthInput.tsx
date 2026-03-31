import { useState, useRef, useEffect, useCallback } from 'react';
import { UI_SURFACE, UI_BORDER, UI_TEXT_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import { LENGTH_PLACEHOLDER } from '@/config/messages';
import { parseFrenchNumber } from '@/engine/format';
import type { DisplayUnit } from '@/model/types';

interface LengthInputProps {
  readonly segmentLabel: string;
  readonly currentLengthMm: number;
  readonly displayUnit: DisplayUnit;
  readonly onSubmit: (lengthMm: number) => void;
  readonly onDismiss: () => void;
  /** Called when user clears a fixed length (× button or empty submit). */
  readonly onClear?: () => void;
  /** If the segment already has a fixed length, show it pre-filled. */
  readonly fixedLengthMm?: number;
  /** Position near segment midpoint (CSS px relative to canvas container). */
  readonly positionPx?: { x: number; y: number };
}

/**
 * Inline length input field.
 * Appears after segment creation. Accepts French comma format.
 * Enter confirms, Escape/click elsewhere dismisses.
 */
export function LengthInput({
  segmentLabel,
  currentLengthMm: _currentLengthMm,
  displayUnit,
  onSubmit,
  onDismiss,
  onClear,
  fixedLengthMm,
  positionPx,
}: LengthInputProps) {
  const [value, setValue] = useState(() => {
    if (fixedLengthMm == null) return '';
    const displayValue = displayUnit === 'cm' ? fixedLengthMm / 10 : fixedLengthMm;
    return displayValue.toFixed(1).replace('.', ',');
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // Focus input after a brief delay (don't steal from canvas immediately)
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Detect virtual keyboard via visualViewport (spec §6.1)
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

  // Dismiss on click/tap outside (pointerdown for touch compatibility, I5 fix)
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    // Delay to avoid catching the click that opened us
    const timer = setTimeout(() => document.addEventListener('pointerdown', handler), 200);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handler);
    };
  }, [onDismiss]);

  const handleClear = useCallback(() => {
    if (onClear) onClear();
    onDismiss();
  }, [onClear, onDismiss]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed === '' && fixedLengthMm != null) {
      handleClear();
      return;
    }
    const parsed = parseFrenchNumber(trimmed);
    if (parsed !== null && parsed > 0) {
      const mm = displayUnit === 'cm' ? parsed * 10 : parsed;
      onSubmit(mm);
    }
    onDismiss();
  }, [value, fixedLengthMm, displayUnit, onSubmit, onDismiss, handleClear]);

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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        ...(keyboardVisible
          ? { top: 80, left: '50%', transform: 'translateX(-50%)' }
          : positionPx
            ? {
                top: Math.max(10, positionPx.y - 60),
                left: Math.max(10, Math.min(positionPx.x - 100, window.innerWidth - 220)),
              }
            : { bottom: 60, left: '50%', transform: 'translateX(-50%)' }),
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
      data-testid="length-input"
    >
      <label style={{ fontSize: 12, color: UI_TEXT_PRIMARY }}>
        {fixedLengthMm != null
          ? `Longueur fixée — segment ${segmentLabel} :`
          : `Longueur du segment ${segmentLabel} :`}
      </label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 160 }}>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={LENGTH_PLACEHOLDER}
            style={{
              width: '100%',
              height: MIN_BUTTON_SIZE_PX - 8,
              padding: fixedLengthMm != null && onClear ? '4px 36px 4px 8px' : '4px 8px',
              border: `1px solid ${UI_BORDER}`,
              borderRadius: 4,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            data-testid="length-input-field"
          />
          {fixedLengthMm != null && onClear && (
            <button
              onClick={handleClear}
              style={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 28,
                height: 28,
                border: 'none',
                borderRadius: 4,
                background: 'transparent',
                color: UI_TEXT_PRIMARY,
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              aria-label="Libérer la longueur fixée"
              data-testid="length-clear"
            >
              ✕
            </button>
          )}
        </div>
        <span style={{ fontSize: 13, color: UI_TEXT_PRIMARY }}>{displayUnit}</span>
      </div>
    </div>
  );
}
