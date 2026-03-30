import type { TutorialStep } from '@/hooks/useTutorial';
import { UI_TEXT_PRIMARY, UI_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

interface TutorialOverlayProps {
  readonly step: TutorialStep;
  readonly onSkip: () => void;
  readonly onFinish: () => void;
  readonly onDismissPost: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const undoKey = isMac ? 'Cmd+Z' : 'Ctrl+Z';

const STEP_MESSAGES: Record<number, string> = {
  1: 'Clique sur la grille pour placer un point.',
  2: 'Clique encore pour tracer un segment.',
  3: `Oups? Appuie ${undoKey} ou clique « Annuler » pour revenir en arrière.`,
  4: "C'est tout! Tu sais construire.",
};

/**
 * Tutorial overlay — semi-transparent, pointer-events:none (clicks pass through).
 * Only the instruction banner and "Passer" button capture clicks.
 */
export function TutorialOverlay({ step, onSkip, onFinish, onDismissPost }: TutorialOverlayProps) {
  if (step === 'done') return null;

  // Post-tutorial: central message
  if (step === 'post') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 25,
        }}
        onClick={onDismissPost}
        data-testid="tutorial-post"
      >
        <div
          style={{
            fontSize: 18,
            color: '#6B7280',
            textAlign: 'center',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        >
          Clique n'importe où pour commencer!
        </div>
      </div>
    );
  }

  const message = STEP_MESSAGES[step as number] ?? '';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 25,
      }}
      data-testid="tutorial-overlay"
    >
      {/* Semi-transparent background */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />

      {/* Skip button — top right, captures clicks */}
      <button
        onClick={onSkip}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          pointerEvents: 'auto',
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #D1D8E0',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
          color: '#6B7280',
          zIndex: 26,
        }}
        data-testid="tutorial-skip"
      >
        Passer
      </button>

      {/* Instruction banner — bottom, captures clicks */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.95)',
          borderTop: '1px solid #D1D8E0',
          padding: '16px 20px',
          textAlign: 'center',
          zIndex: 26,
        }}
        data-testid="tutorial-banner"
      >
        <div style={{ fontSize: 16, color: UI_TEXT_PRIMARY, fontWeight: 500 }}>{message}</div>
        {step === 4 && (
          <button
            onClick={onFinish}
            style={{
              marginTop: 12,
              height: MIN_BUTTON_SIZE_PX,
              padding: '0 24px',
              background: UI_PRIMARY,
              color: '#FFF',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
            }}
            data-testid="tutorial-finish"
          >
            Commencer
          </button>
        )}
      </div>
    </div>
  );
}
