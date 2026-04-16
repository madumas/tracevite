/**
 * About dialog — spec §19 v2bis.
 * Accessible via click on "GéoMolo" in header.
 */

import { useEffect, useState } from 'react';
import {
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_PRIMARY,
} from '@/config/theme';
import { GeoMoloLogo } from './GeoMoloLogo';

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
        aria-labelledby="about-title"
      >
        <img src="/favicon.svg" alt="" width={64} height={64} style={{ marginBottom: 8 }} />
        <div id="about-title">
          <GeoMoloLogo height={40} />
        </div>
        <div style={{ height: 8 }} />
        <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginBottom: 16 }}>
          {isProductionHost() ? `v${__APP_VERSION__}` : `dev (${__BUILD_HASH__})`}
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.5, color: UI_TEXT_PRIMARY, margin: '0 0 16px' }}>
          Règle, compas et rapporteur numériques pour les enfants qui ont du mal avec les vrais.
          L'enfant fait le raisonnement, l'outil exécute le geste.
        </p>

        <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginBottom: 8 }}>
          Logiciel libre —{' '}
          <a
            href="https://github.com/madumas/geomolo"
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
            gap: 2,
          }}
        >
          Contact :{' '}
          <a href="mailto:info@allomolo.ca" style={{ color: UI_PRIMARY }}>
            info@allomolo.ca
          </a>
          <CopyButton />
        </div>

        <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginBottom: 12 }}>
          Aussi par le même créateur :{' '}
          <a
            href="https://resomolo.ca"
            target="_blank"
            rel="noopener"
            style={{ color: UI_PRIMARY, fontWeight: 600 }}
          >
            ResoMolo.ca
          </a>{' '}
          — modélisation de problèmes de maths
        </div>

        <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, marginBottom: 16 }}>
          Créé par un parent, pour son enfant — et tous ceux qui en ont besoin.
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
          await navigator.clipboard?.writeText('info@allomolo.ca');
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
        padding: '4px',
        minWidth: 24,
        minHeight: 44,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: copied ? '#22C55E' : UI_TEXT_SECONDARY,
      }}
      title="Copier l'adresse"
      aria-label="Copier l'adresse courriel"
    >
      {copied ? (
        '✓'
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
        </svg>
      )}
    </button>
  );
}

declare const __APP_VERSION__: string;
declare const __BUILD_HASH__: string;

/**
 * Detect production via hostname to avoid false "dev" labels when
 * CF_PAGES_BRANCH is something other than "main" (hotfix branches,
 * preview promotions, detached HEAD builds).
 */
function isProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  // "geomolo.ca" or any non-"dev." subdomain of geomolo.ca
  return host === 'geomolo.ca' || (host.endsWith('.geomolo.ca') && !host.startsWith('dev.'));
}
