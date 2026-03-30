import { useState, useEffect, useRef } from 'react';
import type { ConstructionState } from '@/model/types';

export type TutorialStep = 1 | 2 | 3 | 'post' | 'done';

const TUTORIAL_KEY = 'tracevite_tutorial_completed';

/** Detect if this is the first launch (no tutorial completed flag). */
function isFirstLaunch(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) !== 'true';
  } catch {
    return true;
  }
}

function markCompleted(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'true');
  } catch {
    // non-critical
  }
}

export function useTutorial(state: ConstructionState) {
  const [step, setStep] = useState<TutorialStep>(() => (isFirstLaunch() ? 1 : 'done'));
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
    markCompleted();
  };

  const finish = () => {
    setStep('post');
    markCompleted();
  };

  const dismissPost = () => {
    setStep('done');
  };

  const isActive = step !== 'done';

  return { step, skip, finish, dismissPost, isActive };
}
