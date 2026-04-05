import { useState, useEffect, useRef, useCallback } from 'react';
import type { ConstructionState } from '@/model/types';

export type TutorialStep = 1 | 2 | 3 | 'post' | 'done';

/** Tutorial step messages (exported for status bar rendering). */
export const TUTORIAL_MESSAGES: Record<1 | 2 | 3, string> = {
  1: 'Clique deux fois sur la grille pour tracer un segment.',
  2: `Appuie ${typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? 'Cmd' : 'Ctrl'}+Z ou clique « Annuler » pour revenir en arrière.`,
  3: "C'est tout! Tu sais construire.",
};

export function useTutorial(state: ConstructionState, onStart?: () => void) {
  const [step, setStep] = useState<TutorialStep>('done');
  const prevPointsRef = useRef(state.points.length);
  const prevSegmentsRef = useRef(state.segments.length);

  // Auto-advance based on construction changes (single effect to avoid ref race).
  // Step 1→2: first segment created
  // Step 2→3: undo detected (points or segments decreased)
  useEffect(() => {
    if (step === 'done' || step === 'post') return;

    const prevPts = prevPointsRef.current;
    const prevSegs = prevSegmentsRef.current;

    if (step === 1 && state.segments.length > prevSegs) {
      setStep(2);
    } else if (step === 2 && (state.points.length < prevPts || state.segments.length < prevSegs)) {
      setStep(3);
    }

    prevPointsRef.current = state.points.length;
    prevSegmentsRef.current = state.segments.length;
  }, [state.points.length, state.segments.length, step]);

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

  return { step, skip, finish, dismissPost, start, isActive };
}
