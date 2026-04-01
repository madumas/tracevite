import { useEffect, useRef } from 'react';
import {
  UI_PRIMARY,
  UI_DESTRUCTIVE,
  UI_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

interface ConfirmDialogProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Modal confirmation dialog with focus trap.
 * Large cancel button (blue, primary) vs small confirm button (red).
 * Escape closes (cancel).
 */
export function ConfirmDialog({
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button (safe default) on mount
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onCancel]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onCancel}
      data-testid="confirm-dialog-overlay"
    >
      <div
        style={{
          background: UI_SURFACE,
          borderRadius: 12,
          padding: '24px 28px',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="confirm-dialog"
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: UI_TEXT_PRIMARY, margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: UI_TEXT_SECONDARY, margin: '8px 0 0' }}>{subtitle}</p>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          {/* Confirm (small, red) */}
          <button
            onClick={onConfirm}
            style={{
              height: MIN_BUTTON_SIZE_PX,
              padding: '0 12px',
              border: 'none',
              borderRadius: 4,
              background: UI_DESTRUCTIVE,
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: 13,
            }}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </button>

          {/* Cancel (large, blue, default focus) */}
          <button
            ref={cancelRef}
            onClick={onCancel}
            style={{
              height: MIN_BUTTON_SIZE_PX,
              padding: '0 20px',
              border: 'none',
              borderRadius: 4,
              background: UI_PRIMARY,
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
            data-testid="confirm-dialog-cancel"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
