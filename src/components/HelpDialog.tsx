/**
 * Help dialog — contextual help panel with tutorial, adaptation info, and about link.
 */

import { useEffect } from 'react';
import {
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_PRIMARY,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

interface HelpDialogProps {
  readonly onClose: () => void;
  readonly onStartTutorial: () => void;
  readonly onShowAbout: () => void;
}

export function HelpDialog({ onClose, onStartTutorial, onShowAbout }: HelpDialogProps) {
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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: UI_SURFACE,
          borderRadius: 12,
          padding: '24px',
          maxWidth: 400,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          border: `1px solid ${UI_BORDER}`,
          color: UI_TEXT_PRIMARY,
          fontFamily: 'system-ui, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Aide"
        data-testid="help-dialog"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Aide</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: UI_TEXT_SECONDARY,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Tutoriel */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 12px', color: UI_TEXT_PRIMARY }}>
            Apprends à construire et corriger en quelques clics.
          </p>
          <button
            onClick={onStartTutorial}
            style={{
              width: '100%',
              minHeight: MIN_BUTTON_SIZE_PX,
              padding: '8px 16px',
              background: UI_PRIMARY,
              color: '#FFF',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
            data-testid="help-start-tutorial"
          >
            Commencer le tutoriel
          </button>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: UI_BORDER, margin: '8px 0' }} />

        {/* Section 3: Documentation + À propos */}
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href="https://geomolo.ca/docs/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              boxSizing: 'border-box',
              width: '100%',
              minHeight: MIN_BUTTON_SIZE_PX,
              padding: '8px 16px',
              background: UI_PRIMARY,
              color: '#FFF',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            data-testid="help-documentation"
          >
            Documentation
          </a>
          <button
            onClick={onShowAbout}
            style={{
              width: '100%',
              minHeight: MIN_BUTTON_SIZE_PX,
              padding: '8px 16px',
              background: 'transparent',
              color: UI_PRIMARY,
              border: `1px solid ${UI_PRIMARY}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
            data-testid="help-show-about"
          >
            À propos de GéoMolo
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
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
}
