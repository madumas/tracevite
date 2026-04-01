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
import { usePreferences, useUpdatePreference } from '@/model/preferences';
import type { PageFormat } from '@/model/preferences';

interface PrintDialogProps {
  readonly state: ConstructionState;
  readonly slotName: string;
  readonly landscape: boolean;
  readonly onLandscapeChange: (landscape: boolean) => void;
  readonly includeMeasurements: boolean;
  readonly onIncludeMeasurementsChange: (v: boolean) => void;
  readonly includeConsigne: boolean;
  readonly onIncludeConsigneChange: (v: boolean) => void;
  readonly onClose: () => void;
  readonly onRecenter: () => void;
}

export function PrintDialog({
  state,
  slotName,
  landscape,
  onLandscapeChange,
  includeMeasurements,
  onIncludeMeasurementsChange,
  includeConsigne,
  onIncludeConsigneChange,
  onClose,
  onRecenter,
}: PrintDialogProps) {
  const [hideWarning, setHideWarning] = useState(() => {
    try {
      return localStorage.getItem('tracevite_hide_print_warning') === 'true';
    } catch {
      return false;
    }
  });
  const prefs = usePreferences();
  const updatePref = useUpdatePreference();
  const pageFormat = prefs.pageFormat;
  const setPageFormat = (format: PageFormat) => updatePref('pageFormat', format);

  const fitsPage = figureFitsInPage(state, landscape, pageFormat);
  const offCenter = figureIsOffCenter(state, landscape, pageFormat);

  const handleDownloadPDF = () => {
    const doc = generatePDF(state, {
      landscape,
      includeConsigne,
      includeGrid: false,
      includeMeasurements,
      pageFormat,
    });
    const filename = `${sanitizeFilename(slotName)}.pdf`;
    doc.save(filename);
    onClose();
  };

  const handleDirectPrint = () => {
    // Inject dynamic @page with correct orientation
    const style = document.createElement('style');
    const size = pageFormat === 'a4' ? 'A4' : 'letter';
    style.textContent = `@page { size: ${size}${landscape ? ' landscape' : ''}; margin: 15mm; }`;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
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
            onClick={() => onLandscapeChange(false)}
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
            onClick={() => onLandscapeChange(true)}
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

        {/* Page format selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setPageFormat('letter')}
            style={{
              flex: 1,
              padding: '8px',
              border: `2px solid ${pageFormat === 'letter' ? UI_PRIMARY : UI_BORDER}`,
              borderRadius: 6,
              background: pageFormat === 'letter' ? '#E8F0FA' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              color: UI_TEXT_PRIMARY,
            }}
          >
            Lettre US
          </button>
          <button
            onClick={() => setPageFormat('a4')}
            style={{
              flex: 1,
              padding: '8px',
              border: `2px solid ${pageFormat === 'a4' ? UI_PRIMARY : UI_BORDER}`,
              borderRadius: 6,
              background: pageFormat === 'a4' ? '#E8F0FA' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              color: UI_TEXT_PRIMARY,
            }}
          >
            A4
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
              onChange={() => onIncludeConsigneChange(!includeConsigne)}
            />
            Inclure la consigne
          </label>
        )}

        {/* Measurements toggle */}
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
            checked={includeMeasurements}
            onChange={() => onIncludeMeasurementsChange(!includeMeasurements)}
          />
          {includeMeasurements ? 'Avec mesures' : 'Figure seule'}
        </label>

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
