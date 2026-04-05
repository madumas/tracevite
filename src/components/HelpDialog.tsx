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
import { AccordionSection } from './AccordionSection';

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

        {/* Section 2: Mesures d'adaptation (collapsed by default) */}
        <AccordionSection title="Mesures d'adaptation">
          <div style={{ fontSize: 13, lineHeight: 1.6, color: UI_TEXT_PRIMARY }}>
            <p style={{ fontWeight: 700, margin: '0 0 6px' }}>
              GéoMolo : l'équivalent numérique de la règle, du compas et du rapporteur
            </p>
            <p style={{ margin: '0 0 12px' }}>
              GéoMolo compense les gestes moteurs que la physiologie de l'enfant l'empêche
              d'exécuter avec précision. L'outil exécute le tracé ; l'enfant fait le raisonnement
              géométrique. Il compense le geste, pas le raisonnement.
            </p>

            <p style={{ fontWeight: 700, margin: '0 0 6px' }}>Ce que l'outil fait et ne fait pas</p>
            <table
              style={{
                width: '100%',
                fontSize: 12,
                borderCollapse: 'collapse',
                marginBottom: 12,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '4px 8px',
                      borderBottom: `1px solid ${UI_BORDER}`,
                      color: UI_PRIMARY,
                      fontWeight: 600,
                    }}
                  >
                    Fait
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '4px 8px',
                      borderBottom: `1px solid ${UI_BORDER}`,
                      color: UI_TEXT_SECONDARY,
                      fontWeight: 600,
                    }}
                  >
                    Ne fait pas
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Trace des segments droits', 'Ne calcule pas le périmètre'],
                  ['Trace des cercles', "Ne calcule pas l'aire"],
                  ['Affiche les longueurs', "N'identifie pas les propriétés à la place de l'élève"],
                  [
                    'Mesure les angles',
                    'Ne propose pas de figures et ne valide pas la construction',
                  ],
                ].map(([fait, neFaitPas], i) => (
                  <tr key={i}>
                    <td style={{ padding: '3px 8px', borderBottom: `1px solid ${UI_BORDER}` }}>
                      {fait}
                    </td>
                    <td
                      style={{
                        padding: '3px 8px',
                        borderBottom: `1px solid ${UI_BORDER}`,
                        color: UI_TEXT_SECONDARY,
                      }}
                    >
                      {neFaitPas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ margin: '0 0 12px', fontStyle: 'italic', color: UI_TEXT_SECONDARY }}>
              L'outil n'anticipe pas les choix de l'élève et n'indique pas si la construction est
              juste ou fausse. La mesure d'adaptation retire la barrière motrice, pas donner un
              avantage sur la compétence évaluée.
            </p>

            <p style={{ fontWeight: 700, margin: '0 0 6px' }}>Modes pour les évaluations</p>
            <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
              <li style={{ marginBottom: 6 }}>
                <strong>Masquer les propriétés</strong> — cache les classifications automatiques
                (type de triangle, parallélisme, etc.) mais conserve les longueurs et les angles.
                L'élève voit ses tracés, pas les réponses.
              </li>
              <li>
                <strong>Mode Estimation</strong> — masque les mesures (longueurs, angles) jusqu'à ce
                que l'élève demande à les voir. Utile si la compétence évaluée inclut la lecture
                d'instruments.
              </li>
            </ul>
            <p style={{ margin: 0, fontSize: 12, color: UI_TEXT_SECONDARY }}>
              Ces modes se trouvent dans les Paramètres (⚙) et peuvent être préconfigurés via un
              fichier .geomolo-config.
            </p>
          </div>
        </AccordionSection>

        {/* Separator */}
        <div style={{ height: 1, background: UI_BORDER, margin: '8px 0' }} />

        {/* Section 3: À propos */}
        <div style={{ marginBottom: 16 }}>
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
