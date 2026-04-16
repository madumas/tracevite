import { useState, useCallback, type ReactNode } from 'react';
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_PRIMARY, UI_BORDER } from '@/config/theme';
import { usePreferences, useUpdatePreference } from '@/model/preferences';
import { prefersReducedMotion } from '@/config/accessibility';

interface AccordionSectionProps {
  /** Stable id used to persist open/closed state in user preferences (QA 4.3). */
  readonly id?: string;
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}

/**
 * Collapsible section for the properties panel.
 * When `id` is provided, the open/closed state persists in user preferences
 * (QA 4.3 — reduces executive-function load for students with DCD).
 *
 * Visual design:
 *  - SVG chevron (18px, stable across OS fonts) instead of ▶ character
 *  - Background tint when open for dual-encoding (color + shape)
 *  - max-height transition rather than hard toggle to avoid « pop » surprise
 *  - Respects prefers-reduced-motion
 */
export function AccordionSection({
  id,
  title,
  defaultOpen = false,
  children,
}: AccordionSectionProps) {
  const prefs = usePreferences();
  const updatePref = useUpdatePreference();

  const persistedOpen = id !== undefined ? prefs.accordionState[id] : undefined;
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = persistedOpen !== undefined ? persistedOpen : localOpen;

  const toggle = useCallback(() => {
    const next = !open;
    if (id !== undefined) {
      updatePref('accordionState', { ...prefs.accordionState, [id]: next });
    } else {
      setLocalOpen(next);
    }
  }, [id, open, prefs.accordionState, updatePref]);

  const reduce = typeof window !== 'undefined' && prefersReducedMotion();
  const transition = reduce ? 'none' : 'transform 0.25s ease-out';
  const contentId = id ? `accordion-content-${id}` : undefined;

  return (
    <div style={{ borderBottom: `1px solid ${UI_BORDER}` }}>
      <button
        onClick={toggle}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: open ? '#E8F4F3' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 600,
          color: UI_TEXT_PRIMARY,
          textAlign: 'left',
        }}
        aria-expanded={open}
        aria-controls={contentId}
        data-testid={`accordion-${title}`}
      >
        {title}
        <svg
          width={18}
          height={18}
          viewBox="0 0 16 16"
          aria-hidden="true"
          style={{
            color: open ? UI_PRIMARY : UI_TEXT_SECONDARY,
            transition,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          <path
            d="M6 4 L10 8 L6 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          id={contentId}
          style={{ padding: '4px 10px 8px' }}
          data-testid={`accordion-content-${title}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
