import { useState } from 'react';
import type { ConstructionState } from '@/model/types';
import {
  UI_PRIMARY,
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_DESTRUCTIVE,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import { generatePDF, figureFitsInPage, figureIsOffCenter } from '@/engine/pdf-export';
import { sanitizeFilename } from '@/model/file-io';

interface PrintDialogProps {
  readonly state: ConstructionState;
  readonly slotName: string;
  readonly onClose: () => void;
  readonly onRecenter: () => void;
}

export function PrintDialog({ state, slotName, onClose, onRecenter }: PrintDialogProps) {
  const [landscape, setLandscape] = useState(false);
  const [hideWarning, setHideWarning] = useState(() => {
    try {
      return localStorage.getItem('tracevite_hide_print_warning') === 'true';
    } catch {
      return false;
    }
  });
  const [includeConsigne, setIncludeConsigne] = useState(false);

  const fitsPage = figureFitsInPage(state, landscape);
  const offCenter = figureIsOffCenter(state, landscape);

  const handleDownloadPDF = () => {
    const doc = generatePDF(state, { landscape, includeConsigne, includeGrid: false });
    const filename = `${sanitizeFilename(slotName)}.pdf`;
    doc.save(filename);
    onClose();
  };

  const handleDirectPrint = () => {
    window.print();
    onClose();
  };

  const handleToggleWarning = () => {
    const next = !hideWarning;
    setHideWarning(next);
    try {
      localStorage.setItem('tracevite_hide_print_warning', String(next));
    } catch {
      /* non-critical */
    }
  };

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
      onClick={onClose}
    >
      <div
        style={{
          background: UI_SURFACE,
          borderRadius: 12,
          padding: '24px 28px',
          maxWidth: 440,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="print-dialog"
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: UI_TEXT_PRIMARY }}>
          Imprimer la construction
        </h2>

        {/* Orientation toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setLandscape(false)}
            style={{
              flex: 1,
              padding: '8px',
              border: `2px solid ${!landscape ? UI_PRIMARY : UI_BORDER}`,
              borderRadius: 6,
              background: !landscape ? '#E8F0FA' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              color: UI_TEXT_PRIMARY,
            }}
          >
            Portrait
          </button>
          <button
            onClick={() => setLandscape(true)}
            style={{
              flex: 1,
              padding: '8px',
              border: `2px solid ${landscape ? UI_PRIMARY : UI_BORDER}`,
              borderRadius: 6,
              background: landscape ? '#E8F0FA' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              color: UI_TEXT_PRIMARY,
            }}
          >
            Paysage
          </button>
        </div>

        {/* Scale warning */}
        {!hideWarning && (
          <div
            style={{
              background: '#FFF8E1',
              border: '1px solid #FFE082',
              borderRadius: 8,
              padding: '12px',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: '#E65100' }}>
              IMPRIME À 100% (taille réelle)
            </div>
            <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginTop: 4 }}>
              Dans les paramètres d'impression, choisis « Taille réelle » ou « 100% ».
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              <input type="checkbox" onChange={handleToggleWarning} />
              Ne plus afficher
            </label>
          </div>
        )}

        {/* Figure warnings */}
        {!fitsPage && (
          <div
            style={{
              background: '#FFEBEE',
              border: '1px solid #EF9A9A',
              borderRadius: 8,
              padding: '10px',
              marginBottom: 12,
              fontSize: 13,
              color: UI_DESTRUCTIVE,
            }}
          >
            Ta figure dépasse la feuille. Change l'orientation ou réduis la taille.
          </div>
        )}
        {fitsPage && offCenter && (
          <div
            style={{
              background: '#E3F2FD',
              border: '1px solid #90CAF9',
              borderRadius: 8,
              padding: '10px',
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            Ta figure est près du bord de la page.
            <button
              onClick={() => {
                onRecenter();
              }}
              style={{
                marginLeft: 8,
                padding: '2px 8px',
                background: UI_PRIMARY,
                color: '#FFF',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Recentrer sur la page
            </button>
          </div>
        )}

        {/* Consigne toggle */}
        {state.consigne && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={includeConsigne}
              onChange={() => setIncludeConsigne(!includeConsigne)}
            />
            Inclure la consigne
          </label>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={handleDirectPrint}
            style={{
              height: MIN_BUTTON_SIZE_PX - 4,
              padding: '0 14px',
              border: `1px solid ${UI_BORDER}`,
              borderRadius: 4,
              background: 'transparent',
              color: UI_TEXT_PRIMARY,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Imprimer directement
          </button>
          <button
            onClick={handleDownloadPDF}
            style={{
              height: MIN_BUTTON_SIZE_PX - 4,
              padding: '0 18px',
              border: 'none',
              borderRadius: 4,
              background: UI_PRIMARY,
              color: '#FFF',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
            data-testid="print-download-pdf"
          >
            Télécharger le PDF
          </button>
        </div>
      </div>
    </div>
  );
}
