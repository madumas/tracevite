/**
 * Blocking screen shown when GéoMolo detects a second tab open on the same
 * origin (QA item 1.10). Prevents last-write-wins contamination between tabs.
 */

import {
  UI_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_PRIMARY,
  UI_BORDER,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

export function DuplicateTabBlocker() {
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
          GéoMolo est déjà ouvert
        </h2>
        <p style={{ fontSize: 14, color: UI_TEXT_SECONDARY, margin: '0 0 16px', lineHeight: 1.5 }}>
          Pour éviter de perdre ton travail, ferme cet onglet et utilise l'autre.
        </p>
        <button
          type="button"
          onClick={() => {
            window.close();
            // If window.close fails (not opened via script), reload the page so
            // the user can still work in this tab after closing the other.
          }}
          style={{
            background: UI_PRIMARY,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: MIN_BUTTON_SIZE_PX,
            minWidth: MIN_BUTTON_SIZE_PX,
          }}
        >
          Fermer cet onglet
        </button>
      </div>
    </div>
  );
}
