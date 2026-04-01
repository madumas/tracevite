import { useState, useRef, useEffect, useCallback } from 'react';
import type { DisplayMode } from '@/model/types';
import {
  UI_SURFACE,
  UI_BORDER,
  UI_PRIMARY,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import {
  MODE_SIMPLIFIE_LABEL,
  MODE_SIMPLIFIE_DETAIL,
  MODE_COMPLET_LABEL,
  MODE_COMPLET_DETAIL,
} from '@/config/messages';

interface ModeSelectorProps {
  readonly mode: DisplayMode;
  readonly onChange: (mode: DisplayMode) => void;
}

const MODES: Array<{ value: DisplayMode; label: string; detail: string }> = [
  { value: 'simplifie', label: MODE_SIMPLIFIE_LABEL, detail: MODE_SIMPLIFIE_DETAIL },
  { value: 'complet', label: MODE_COMPLET_LABEL, detail: MODE_COMPLET_DETAIL },
];

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMode = MODES.find((m) => m.value === mode) ?? MODES[0]!;

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusIndex((i) => Math.min(i + 1, MODES.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          onChange(MODES[focusIndex]!.value);
          setOpen(false);
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, focusIndex, onChange],
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          height: MIN_BUTTON_SIZE_PX,
          padding: '4px 10px',
          background: UI_SURFACE,
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
          color: UI_TEXT_PRIMARY,
          whiteSpace: 'nowrap',
        }}
        data-testid="mode-selector"
      >
        {currentMode.label}
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: UI_SURFACE,
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 50,
            minWidth: 220,
          }}
          data-testid="mode-dropdown"
        >
          {MODES.map((m, index) => (
            <div
              key={m.value}
              role="option"
              aria-selected={m.value === mode}
              onClick={() => {
                onChange(m.value);
                setOpen(false);
              }}
              onMouseEnter={() => setFocusIndex(index)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: index === focusIndex ? '#F0F4F8' : 'transparent',
                borderLeft: m.value === mode ? `3px solid ${UI_PRIMARY}` : '3px solid transparent',
              }}
              data-testid={`mode-option-${m.value}`}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: UI_TEXT_PRIMARY }}>{m.label}</div>
              <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY }}>{m.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
