import { useState, useEffect, useRef } from 'react';
import type { ConstructionState } from '@/model/types';

export type TutorialStep = 1 | 2 | 3 | 'post' | 'done';

export function useTutorial(state: ConstructionState) {
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

  const start = () => {
    setStep(1);
    prevPointsRef.current = state.points.length;
    prevSegmentsRef.current = state.segments.length;
  };

  const isActive = step !== 'done';

  return { step, skip, finish, dismissPost, start, isActive };
}
