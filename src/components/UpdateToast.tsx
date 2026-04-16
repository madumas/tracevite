/**
 * PWA update toast (spec §4.1.2 + QA item 2.1).
 *
 * Design rationale (consolidated from ergo / neuropsy / UX reviews):
 * - Positive, reassuring wording (« Ton travail est sauvegardé »).
 * - Bottom-right position — never overlaps the status bar (child's primary
 *   sequencing cue).
 * - No auto-dismiss: keeps control with the child. Explicit close button.
 * - Only renders when the active tool is idle (caller passes `visible`).
 * - Respects `prefers-reduced-motion` — no fade/slide animation when set.
 * - Pre-reload: show a brief « Rechargement… » screen so the child doesn't see
 *   a bare white flash.
 */

import { useEffect, useState } from 'react';
import {
  UI_PRIMARY,
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from '@/config/theme';
import { prefersReducedMotion } from '@/config/accessibility';

interface UpdateToastProps {
  readonly visible: boolean;
  readonly onReload: () => Promise<void> | void;
  readonly onDismiss: () => void;
}

export function UpdateToast({ visible, onReload, onDismiss }: UpdateToastProps) {
  const [reloading, setReloading] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(prefersReducedMotion());
  }, []);

  if (!visible && !reloading) return null;

  if (reloading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255,255,255,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          fontFamily: 'system-ui, sans-serif',
          color: UI_TEXT_PRIMARY,
          fontSize: 16,
          padding: 24,
          textAlign: 'center',
        }}
      >
        Ton travail est sauvegardé. Rechargement…
      </div>
    );
  }

  const handleReload = async () => {
    setReloading(true);
    try {
      await onReload();
    } catch {
      setReloading(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        maxWidth: 320,
        minWidth: 280,
        background: UI_SURFACE,
        border: `1px solid ${UI_BORDER}`,
        borderLeft: `4px solid ${UI_PRIMARY}`,
        borderRadius: 8,
        padding: '14px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 1200,
        fontFamily: 'system-ui, sans-serif',
        color: UI_TEXT_PRIMARY,
        fontSize: 14,
        lineHeight: 1.4,
        animation: reduceMotion ? 'none' : 'geomoloUpdateToastIn 300ms ease-out',
      }}
    >
      <style>{`
        @keyframes geomoloUpdateToastIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span aria-hidden="true" style={{ fontSize: 18, lineHeight: '1.2em' }}>
          ✨
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>GéoMolo a été amélioré.</div>
          <div style={{ color: UI_TEXT_SECONDARY, fontSize: 13 }}>Ton travail est sauvegardé.</div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: UI_TEXT_SECONDARY,
            fontSize: 20,
            lineHeight: 1,
            padding: 0,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: UI_TEXT_SECONDARY,
            fontSize: 13,
            padding: '8px 12px',
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={handleReload}
          style={{
            background: UI_PRIMARY,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Recharger
        </button>
      </div>
    </div>
  );
}
