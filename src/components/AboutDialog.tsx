/**
 * About dialog — spec §19 v2bis.
 * Accessible via click on "TraceVite" in header.
 */

import { useEffect, useState } from 'react';
import {
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_PRIMARY,
} from '@/config/theme';

interface AboutDialogProps {
  readonly onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
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
          padding: '28px 32px',
          maxWidth: 400,
          width: '90%',
          border: `1px solid ${UI_BORDER}`,
          color: UI_TEXT_PRIMARY,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <img src="/logo.svg" alt="TraceVite" width={48} height={48} style={{ marginBottom: 8 }} />
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>TraceVite</h2>
        <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginBottom: 16 }}>
          v{__APP_VERSION__}
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.5, color: UI_TEXT_PRIMARY, margin: '0 0 16px' }}>
          Outil de construction géométrique numérique pour les élèves du primaire ayant un Trouble
          Développemental de la Coordination (TDC). L'enfant fait le raisonnement, l'outil exécute
          le geste.
        </p>

        <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginBottom: 8 }}>
          Logiciel libre —{' '}
          <a
            href="https://github.com/madumas/tracevite"
            target="_blank"
            rel="noopener"
            style={{ color: UI_PRIMARY }}
          >
            Code source
          </a>
        </div>

        <div
          style={{
            fontSize: 12,
            color: UI_TEXT_SECONDARY,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          Contact :{' '}
          <a href="mailto:ma@tracevite.ca" style={{ color: UI_PRIMARY }}>
            ma@tracevite.ca
          </a>
          <CopyButton />
        </div>

        <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, marginBottom: 16 }}>
          Conçu au Québec pour les enfants TDC et leurs enseignants.
        </div>

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

function CopyButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText('ma@tracevite.ca');
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard non disponible — le lien mailto reste accessible */
        }
      }}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        minWidth: 44,
        minHeight: 44,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: copied ? '#22C55E' : UI_TEXT_SECONDARY,
      }}
      title="Copier l'adresse"
      aria-label="Copier l'adresse courriel"
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}

declare const __APP_VERSION__: string;
