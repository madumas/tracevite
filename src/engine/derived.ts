/**
 * Computed derived state — never stored in ConstructionState.
 * Called via useMemo in App, recalculated on every geometric change.
 */

import type { ConstructionState, AngleInfo, DetectedProperty, DisplayMode } from '@/model/types';
import { detectAllAngles } from './angles';
import { detectAllProperties } from './properties';
import { detectAllFaces, classifyFigures, type Figure } from './figures';

export interface DerivedState {
  readonly angles: AngleInfo[];
  readonly properties: DetectedProperty[];
  readonly figures: Figure[];
}

/**
 * Compute all derived geometric information from construction state.
 * Pure function — deterministic, < 1ms for < 50 segments.
 */
export function computeDerived(state: ConstructionState, displayMode: DisplayMode): DerivedState {
  const angles = detectAllAngles(state);
  const properties = detectAllProperties(state.segments, state.points);
  const faces = detectAllFaces(state);
  const figures = classifyFigures(faces, state, displayMode);

  return { angles, properties, figures };
}
