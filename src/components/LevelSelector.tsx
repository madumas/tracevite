import { useState, useRef, useEffect, useCallback } from 'react';
import type { SchoolLevel } from '@/model/types';
import {
  UI_SURFACE,
  UI_BORDER,
  UI_PRIMARY,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import {
  LEVEL_2E_LABEL,
  LEVEL_2E_DETAIL,
  LEVEL_3E_LABEL,
  LEVEL_3E_DETAIL,
} from '@/config/messages';

interface LevelSelectorProps {
  readonly level: SchoolLevel;
  readonly onChange: (level: SchoolLevel) => void;
}

const LEVELS: Array<{ value: SchoolLevel; label: string; detail: string }> = [
  { value: '2e_cycle', label: LEVEL_2E_LABEL, detail: LEVEL_2E_DETAIL },
  { value: '3e_cycle', label: LEVEL_3E_LABEL, detail: LEVEL_3E_DETAIL },
];

/**
 * Custom dropdown (not native <select>) for school level.
 * Shows two-line options with year and age range for parent comprehension.
 */
export function LevelSelector({ level, onChange }: LevelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLevel = LEVELS.find((l) => l.value === level) ?? LEVELS[0]!;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
          setFocusIndex((i) => Math.min(i + 1, LEVELS.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          onChange(LEVELS[focusIndex]!.value);
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
          height: MIN_BUTTON_SIZE_PX - 8,
          padding: '4px 10px',
          background: UI_SURFACE,
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
          color: UI_TEXT_PRIMARY,
          whiteSpace: 'nowrap',
        }}
        data-testid="level-selector"
      >
        {currentLevel.label} ({currentLevel.detail.split(' ')[0]})
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: UI_SURFACE,
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 50,
            minWidth: 220,
          }}
          data-testid="level-dropdown"
        >
          {LEVELS.map((l, index) => (
            <div
              key={l.value}
              role="option"
              aria-selected={l.value === level}
              onClick={() => {
                onChange(l.value);
                setOpen(false);
              }}
              onMouseEnter={() => setFocusIndex(index)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: index === focusIndex ? '#F0F4F8' : 'transparent',
                borderLeft: l.value === level ? `3px solid ${UI_PRIMARY}` : '3px solid transparent',
              }}
              data-testid={`level-option-${l.value}`}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: UI_TEXT_PRIMARY }}>{l.label}</div>
              <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY }}>{l.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
