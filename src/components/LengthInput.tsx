import { useState, useRef, useEffect, useCallback } from 'react';
import { UI_SURFACE, UI_BORDER, UI_TEXT_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import { LENGTH_PLACEHOLDER } from '@/config/messages';
import type { DisplayUnit } from '@/model/types';

interface LengthInputProps {
  readonly segmentLabel: string;
  readonly currentLengthMm: number;
  readonly displayUnit: DisplayUnit;
  readonly onSubmit: (lengthMm: number) => void;
  readonly onDismiss: () => void;
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
}: LengthInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input after a brief delay (don't steal from canvas immediately)
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    const parsed = parseFrenchNumber(value);
    if (parsed !== null && parsed > 0) {
      const mm = displayUnit === 'cm' ? parsed * 10 : parsed;
      onSubmit(mm);
    }
    onDismiss();
  }, [value, displayUnit, onSubmit, onDismiss]);

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
      style={{
        position: 'absolute',
        bottom: 60,
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
      data-testid="length-input"
    >
      <label style={{ fontSize: 12, color: UI_TEXT_PRIMARY }}>
        Longueur du segment {segmentLabel} :
      </label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onDismiss}
          placeholder={LENGTH_PLACEHOLDER}
          style={{
            width: 160,
            height: MIN_BUTTON_SIZE_PX - 8,
            padding: '4px 8px',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            fontSize: 14,
            outline: 'none',
          }}
          data-testid="length-input-field"
        />
        <span style={{ fontSize: 13, color: UI_TEXT_PRIMARY }}>{displayUnit}</span>
      </div>
    </div>
  );
}

/** Parse a French-formatted number (comma as decimal separator). */
function parseFrenchNumber(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}
