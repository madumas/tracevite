import { useEffect } from 'react';
import { UI_SURFACE, UI_TEXT_PRIMARY } from '@/config/theme';

interface ConsignePopoverProps {
  readonly consigne: string;
  readonly onClose: () => void;
}

/**
 * Full-text popover for consigne. white-space: pre-line preserves line breaks.
 */
export function ConsignePopover({ consigne, onClose }: ConsignePopoverProps) {
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
      data-testid="consigne-popover-overlay"
    >
      <div
        style={{
          background: UI_SURFACE,
          borderRadius: 12,
          padding: '20px 24px',
          maxWidth: 500,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="consigne-popover"
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: UI_TEXT_PRIMARY }}>Consigne</h3>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: UI_TEXT_PRIMARY,
            whiteSpace: 'pre-line',
            lineHeight: 1.5,
          }}
        >
          {consigne}
        </p>
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            padding: '6px 16px',
            background: '#185FA5',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
          }}
          data-testid="consigne-popover-close"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
