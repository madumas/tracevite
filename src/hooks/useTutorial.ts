import { useState, useEffect, useRef, useCallback } from 'react';
import type { ConstructionState } from '@/model/types';

export type TutorialStep = 1 | 2 | 3 | 4 | 'post' | 'done';

/** Tutorial step messages (exported for status bar rendering). */
export const TUTORIAL_MESSAGES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Clique deux fois sur la grille pour tracer un segment.',
  2: `Appuie ${typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? 'Cmd' : 'Ctrl'}+Z ou clique « Annuler » pour revenir en arrière.`,
  3: 'Retrace un segment.',
  4: "C'est tout! Tu sais construire et corriger.",
};

/** Sub-state for step 3: waiting for segment before deletion. */
type Step3Phase = 'need_segment' | 'need_delete';

export function useTutorial(state: ConstructionState, onStart?: () => void) {
  const [step, setStep] = useState<TutorialStep>('done');
  const [step3Phase, setStep3Phase] = useState<Step3Phase>('need_segment');
  const prevPointsRef = useRef(state.points.length);
  const prevSegmentsRef = useRef(state.segments.length);

  // Auto-advance based on construction changes.
  // Step 1→2: first segment created
  // Step 2→3: undo detected (points or segments decreased)
  // Step 3→4: segment created (need_segment→need_delete) then deleted (need_delete→step 4)
  useEffect(() => {
    if (step === 'done' || step === 'post') return;

    const prevPts = prevPointsRef.current;
    const prevSegs = prevSegmentsRef.current;

    if (step === 1 && state.segments.length > prevSegs) {
      setStep(2);
    } else if (step === 2 && (state.points.length < prevPts || state.segments.length < prevSegs)) {
      setStep(3);
      setStep3Phase('need_segment');
    } else if (step === 3) {
      if (step3Phase === 'need_segment' && state.segments.length > prevSegs) {
        setStep3Phase('need_delete');
      } else if (step3Phase === 'need_delete' && state.segments.length < prevSegs) {
        setStep(4);
      }
    }

    prevPointsRef.current = state.points.length;
    prevSegmentsRef.current = state.segments.length;
  }, [state.points.length, state.segments.length, step, step3Phase]);

  const skip = () => {
    setStep('done');
  };

  const finish = () => {
    setStep('post');
  };

  const dismissPost = () => {
    setStep('done');
  };

  const start = useCallback(() => {
    setStep(1);
    prevPointsRef.current = state.points.length;
    prevSegmentsRef.current = state.segments.length;
    onStart?.();
  }, [state.points.length, state.segments.length, onStart]);

  const isActive = step !== 'done';

  /** Dynamic message for step 3 (changes based on sub-phase). */
  const currentMessage =
    typeof step === 'number'
      ? step === 3 && step3Phase === 'need_delete'
        ? 'Clique « Sélectionner », clique sur ton segment, puis clique Supprimer.'
        : TUTORIAL_MESSAGES[step]
      : null;

  return { step, skip, finish, dismissPost, start, isActive, currentMessage };
}
