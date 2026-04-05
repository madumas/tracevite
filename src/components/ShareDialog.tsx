/**
 * Share dialog — link + QR code + print, calqué sur ResoMolo SharePanel.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UI_PRIMARY,
  UI_BORDER,
  UI_TEXT_SECONDARY,
  UI_TEXT_PRIMARY,
  UI_SURFACE,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import {
  generateShareUrl,
  generateQrDataUrl,
  copyTextToClipboard,
  copyImageToClipboard,
  downloadDataUrl,
} from '@/engine/share';
import type { ConstructionState } from '@/model/types';

interface ShareDialogProps {
  readonly state: ConstructionState;
  readonly onClose: () => void;
}

export function ShareDialog({ state, onClose }: ShareDialogProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const url = generateShareUrl(state);
    setShareUrl(url);
    generateQrDataUrl(url).then(setQrDataUrl);
  }, [state]);

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

  const handleCopyLink = useCallback(async () => {
    await copyTextToClipboard(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareUrl]);

  const handleCopyQr = useCallback(async () => {
    if (!qrDataUrl) return;
    const ok = await copyImageToClipboard(qrDataUrl);
    if (ok) {
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    }
  }, [qrDataUrl]);

  const handleDownloadQr = useCallback(() => {
    if (!qrDataUrl) return;
    downloadDataUrl(qrDataUrl, 'geomolo-qr.png');
  }, [qrDataUrl]);

  const hasContent = state.points.length > 0 || !!state.consigne;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: UI_SURFACE,
          borderRadius: 12,
          padding: '20px 24px',
          width: 480,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="share-dialog"
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: UI_TEXT_PRIMARY }}>Partager</h2>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            minWidth: MIN_BUTTON_SIZE_PX,
            minHeight: MIN_BUTTON_SIZE_PX,
            background: 'none',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16,
            color: UI_TEXT_SECONDARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {!hasContent && (
          <div
            style={{
              padding: '12px 0',
              color: UI_TEXT_SECONDARY,
              fontStyle: 'italic',
              fontSize: 13,
            }}
          >
            Construis une figure ou écris des notes avant de partager.
          </div>
        )}

        {hasContent && (
          <>
            {/* ── Section: Lien ── */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  color: UI_TEXT_SECONDARY,
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                Lien de partage
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: 12,
                    border: `1px solid ${UI_BORDER}`,
                    borderRadius: 4,
                    background: '#F5F7FA',
                    color: UI_TEXT_PRIMARY,
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: linkCopied ? '#D1FAE5' : UI_PRIMARY,
                    color: linkCopied ? '#065F46' : '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    minHeight: MIN_BUTTON_SIZE_PX,
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
                  }}
                  data-testid="share-copy-link"
                >
                  {linkCopied ? '✓ Copié!' : 'Copier le lien'}
                </button>
              </div>
              {shareUrl.length > 1500 && (
                <div style={{ fontSize: 10, color: '#B45309', marginTop: 4 }}>
                  Lien long ({shareUrl.length} car.) — le QR code est recommandé.
                </div>
              )}
            </div>

            {/* ── Section: QR Code ── */}
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: UI_TEXT_SECONDARY,
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontWeight: 600,
                  }}
                >
                  QR Code
                </div>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    style={{
                      width: 120,
                      height: 120,
                      cursor: 'pointer',
                      borderRadius: 4,
                      border: `1px solid ${UI_BORDER}`,
                    }}
                    onClick={handleCopyQr}
                    title="Cliquer pour copier l'image"
                  />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      background: '#F5F7FA',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: UI_TEXT_SECONDARY,
                    }}
                  >
                    Chargement...
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  paddingTop: 20,
                }}
              >
                <button
                  onClick={handleDownloadQr}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    background: '#F5F7FA',
                    border: `1px solid ${UI_BORDER}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: UI_TEXT_SECONDARY,
                    minHeight: MIN_BUTTON_SIZE_PX,
                  }}
                >
                  Télécharger le QR
                </button>
                <button
                  onClick={handleCopyQr}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    background: qrCopied ? '#D1FAE5' : '#F5F7FA',
                    border: `1px solid ${qrCopied ? '#065F46' : UI_BORDER}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: qrCopied ? '#065F46' : UI_TEXT_SECONDARY,
                    minHeight: MIN_BUTTON_SIZE_PX,
                    transition: 'all 0.2s',
                  }}
                >
                  {qrCopied ? '✓ Copié!' : 'Copier le QR'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
