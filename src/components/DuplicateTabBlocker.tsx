/**
 * Blocking screen shown when GéoMolo detects a second tab open on the same
 * origin (QA item 1.10). Prevents last-write-wins contamination between tabs.
 *
 * Recovery paths offered to the user:
 *  - « Reprendre ici » → broadcasts a takeover; the other tab becomes the
 *    duplicate so the user can keep working in this tab. This is the reliable
 *    recovery path because `window.close()` is a no-op for tabs the user
 *    opened themselves (browser policy — only script-opened windows can be
 *    closed by script).
 *  - Closing the tab manually with Cmd/Ctrl+W remains always available.
 */

import { useEffect, useState } from 'react';
import {
  UI_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_PRIMARY,
  UI_BORDER,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

interface DuplicateTabBlockerProps {
  readonly onTakeOver: () => void;
}

export function DuplicateTabBlocker({ onTakeOver }: DuplicateTabBlockerProps) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent));
  }, []);
  const closeShortcut = isMac ? 'Cmd+W' : 'Ctrl+W';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="duplicate-tab-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        fontFamily: 'system-ui, sans-serif',
        padding: 16,
      }}
    >
      <div
        style={{
          background: UI_SURFACE,
          borderRadius: 12,
          padding: '28px 32px',
          maxWidth: 440,
          width: '100%',
          border: `1px solid ${UI_BORDER}`,
          color: UI_TEXT_PRIMARY,
          textAlign: 'center',
        }}
      >
        <div aria-hidden="true" style={{ fontSize: 32, lineHeight: 1, marginBottom: 8 }}>
          🗂️
        </div>
        <h2 id="duplicate-tab-title" style={{ fontSize: 18, margin: '0 0 8px' }}>
          GéoMolo est déjà ouvert dans un autre onglet
        </h2>
        <p style={{ fontSize: 14, color: UI_TEXT_SECONDARY, margin: '0 0 20px', lineHeight: 1.5 }}>
          Ton travail est sauvegardé. Tu peux continuer ici ou revenir dans l'autre onglet.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onTakeOver}
            style={{
              background: UI_PRIMARY,
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: MIN_BUTTON_SIZE_PX,
              minWidth: 200,
            }}
          >
            Continuer dans cet onglet
          </button>

          <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginTop: 4 }}>
            ou ferme l'onglet avec {closeShortcut}
          </div>
        </div>
      </div>
    </div>
  );
}
