import { useState, type ReactNode } from 'react';
import { UI_TEXT_PRIMARY, UI_BORDER } from '@/config/theme';

interface AccordionSectionProps {
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}

export function AccordionSection({ title, defaultOpen = false, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: `1px solid ${UI_BORDER}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'transparent',
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
        data-testid={`accordion-${title}`}
      >
        {title}
        <span
          style={{
            fontSize: 10,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </span>
      </button>
      {open && (
        <div style={{ padding: '4px 10px 8px' }} data-testid={`accordion-content-${title}`}>
          {children}
        </div>
      )}
    </div>
  );
}
