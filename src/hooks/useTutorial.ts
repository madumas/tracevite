import { useState, useEffect, useRef } from 'react';
import type { ConstructionState } from '@/model/types';

export type TutorialStep = 1 | 2 | 3 | 'post' | 'done';

export function useTutorial(state: ConstructionState) {
  const [step, setStep] = useState<TutorialStep>('done');
  const prevPointsRef = useRef(state.points.length);
  const prevSegmentsRef = useRef(state.segments.length);

  // Auto-advance based on construction changes.
  // Step 1→2: first segment created (both points + segment added atomically on 2nd click)
  // Step 2→3: waits for undo (handled below)
  useEffect(() => {
    if (step === 'done' || step === 'post') return;

    const segmentsAdded = state.segments.length > prevSegmentsRef.current;

    if (step === 1 && segmentsAdded) {
      setStep(2);
    }

    prevPointsRef.current = state.points.length;
    prevSegmentsRef.current = state.segments.length;
  }, [state.points.length, state.segments.length, step]);

  // Step 2: detect undo (points or segments decreased)
  useEffect(() => {
    if (step !== 2) return;
    if (
      state.points.length < prevPointsRef.current ||
      state.segments.length < prevSegmentsRef.current
    ) {
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
