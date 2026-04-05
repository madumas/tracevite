/**
 * Pure state transition functions.
 * Every function: (state, params) → newState. No mutation, no side effects.
 */

import type {
  ConstructionState,
  GridSize,
  DisplayMode,
  DisplayUnit,
  ToolType,
  Point,
  Segment,
  TextBox,
} from './types';
import { generateId, nextLabel } from './id';
import { distance } from '@/engine/geometry';
import { MIN_POINT_DISTANCE_MM } from '@/config/accessibility';

/** Create a fresh empty construction state. */
export function createInitialState(): ConstructionState {
  return {
    points: [],
    segments: [],
    circles: [],
    textBoxes: [],
    gridSizeMm: typeof window !== 'undefined' && window.innerWidth < 900 ? 10 : 5,
    snapEnabled: true,
    activeTool: 'segment',
    displayMode: 'simplifie',
    displayUnit: 'cm',
    selectedElementId: null,
    consigne: null,
    hideProperties: true, // default hidden in simplifié — child identifies properties themselves
    toleranceProfile: 'default',
    chainTimeoutMs: 8000,
    fontScale: 1,
    keyboardShortcutsEnabled: false,
    soundMode: 'reduced',
    soundGain: 0.5,
    pointToolVisible: false,
    estimationMode: false,
    cartesianMode: 'off',
    autoIntersection: true,
    clutterThreshold: 0, // 0 = use default from CLUTTER_THRESHOLDS (mode-dependent)
  };
}

// ── Geometric actions (push to undo) ──────────────────────

/** Add a point at given coordinates. Returns new state and created point ID. */
export function addPoint(
  state: ConstructionState,
  x: number,
  y: number,
): { state: ConstructionState; pointId: string } {
  const id = generateId();
  const label = nextLabel(state.points.map((p) => p.label));
  const point: Point = { id, x, y, label, locked: false };
  return {
    state: { ...state, points: [...state.points, point] },
    pointId: id,
  };
}

/**
 * Add a segment between two existing points.
 * Returns null if:
 * - Segment length < MIN_POINT_DISTANCE_MM (spec §17: too short)
 * - Duplicate segment already exists (spec §17)
 */
export function addSegment(
  state: ConstructionState,
  startPointId: string,
  endPointId: string,
): { state: ConstructionState; segmentId: string } | null {
  const startPoint = state.points.find((p) => p.id === startPointId);
  const endPoint = state.points.find((p) => p.id === endPointId);
  if (!startPoint || !endPoint) return null;

  // Guard: too short
  const lengthMm = distance(startPoint, endPoint);
  if (lengthMm < MIN_POINT_DISTANCE_MM) return null;

  // Guard: duplicate
  const isDuplicate = state.segments.some(
    (s) =>
      (s.startPointId === startPointId && s.endPointId === endPointId) ||
      (s.startPointId === endPointId && s.endPointId === startPointId),
  );
  if (isDuplicate) return null;

  const id = generateId();
  const segment: Segment = { id, startPointId, endPointId, lengthMm };
  return {
    state: { ...state, segments: [...state.segments, segment] },
    segmentId: id,
  };
}

/**
 * Create a segment atomically: create needed points + segment in one operation.
 * If a startPointId is provided, reuse that point.
 * Returns null if the segment would be too short.
 */
export function createSegment(
  state: ConstructionState,
  start: { x: number; y: number; existingPointId?: string },
  end: { x: number; y: number; existingPointId?: string },
): {
  state: ConstructionState;
  segmentId: string;
  startPointId: string;
  endPointId: string;
} | null {
  let currentState = state;
  let startPointId = start.existingPointId;
  let endPointId = end.existingPointId;

  // Create start point if needed
  if (!startPointId) {
    const result = addPoint(currentState, start.x, start.y);
    currentState = result.state;
    startPointId = result.pointId;
  }

  // Create end point if needed
  if (!endPointId) {
    const result = addPoint(currentState, end.x, end.y);
    currentState = result.state;
    endPointId = result.pointId;
  }

  // Create segment
  const segResult = addSegment(currentState, startPointId, endPointId);
  if (!segResult) return null;

  return {
    state: segResult.state,
    segmentId: segResult.segmentId,
    startPointId,
    endPointId,
  };
}

/** Remove an element by ID, with cascade (removing point removes its segments). */
export function removeElement(state: ConstructionState, elementId: string): ConstructionState {
  // Check if it's a point
  const isPoint = state.points.some((p) => p.id === elementId);
  if (isPoint) {
    // Remove the point and all segments connected to it
    const connectedSegmentIds = state.segments
      .filter((s) => s.startPointId === elementId || s.endPointId === elementId)
      .map((s) => s.id);

    return {
      ...state,
      points: state.points.filter((p) => p.id !== elementId),
      segments: state.segments.filter((s) => !connectedSegmentIds.includes(s.id)),
      circles: state.circles.filter((c) => c.centerPointId !== elementId),
      selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
    };
  }

  // Check if it's a segment
  const isSegment = state.segments.some((s) => s.id === elementId);
  if (isSegment) {
    return {
      ...state,
      segments: state.segments.filter((s) => s.id !== elementId),
      selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
    };
  }

  // Check if it's a circle
  const isCircle = state.circles.some((c) => c.id === elementId);
  if (isCircle) {
    return {
      ...state,
      circles: state.circles.filter((c) => c.id !== elementId),
      selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
    };
  }

  return state;
}

/** Update a point's position. Recomputes connected segment lengths. */
export function updatePointPosition(
  state: ConstructionState,
  pointId: string,
  x: number,
  y: number,
): ConstructionState {
  const newPoints = state.points.map((p) => (p.id === pointId ? { ...p, x, y } : p));

  // Recompute lengths of connected segments
  const newSegments = state.segments.map((s) => {
    if (s.startPointId === pointId || s.endPointId === pointId) {
      const start = newPoints.find((p) => p.id === s.startPointId);
      const end = newPoints.find((p) => p.id === s.endPointId);
      if (start && end) {
        return { ...s, lengthMm: distance(start, end) };
      }
    }
    return s;
  });

  return { ...state, points: newPoints, segments: newSegments };
}

/** Add a circle with given center and radius. */
export function addCircle(
  state: ConstructionState,
  centerPointId: string,
  radiusMm: number,
): { state: ConstructionState; circleId: string } | null {
  if (radiusMm < MIN_POINT_DISTANCE_MM) return null;
  if (!state.points.some((p) => p.id === centerPointId)) return null;

  const id = generateId();
  return {
    state: { ...state, circles: [...state.circles, { id, centerPointId, radiusMm }] },
    circleId: id,
  };
}

/** Set a circle's radius to an exact value (spec §6.3). */
export function setCircleRadius(
  state: ConstructionState,
  circleId: string,
  radiusMm: number,
): ConstructionState {
  const existing = state.circles.find((c) => c.id === circleId);
  if (!existing || radiusMm <= 0) return state;
  const circles = state.circles.map((c) => (c.id === circleId ? { ...c, radiusMm } : c));
  return { ...state, circles };
}

/**
 * Move a point with constraint resolution (spec §6.7).
 * - If connected segment has fixedLength: other endpoint pivots to maintain length.
 * - If other endpoint is locked + fixedLength: constrain moved point to circle.
 * - Propagation stops after 1 level.
 */
export function movePointWithConstraints(
  state: ConstructionState,
  pointId: string,
  x: number,
  y: number,
): ConstructionState {
  // First, move the point
  let newState = updatePointPosition(state, pointId, x, y);

  // Resolve fixedLength constraints on connected segments (1 level only)
  const connectedFixedSegments = newState.segments.filter(
    (s) => s.fixedLength != null && (s.startPointId === pointId || s.endPointId === pointId),
  );

  // Separate locked constraints (affect moved point) from free constraints (affect other point)
  const lockedConstraints: Array<{ centerId: string; radius: number }> = [];
  const freeConstraints: Array<{ segId: string; otherPointId: string; fixedLength: number }> = [];

  for (const seg of connectedFixedSegments) {
    const otherPointId = seg.startPointId === pointId ? seg.endPointId : seg.startPointId;
    const otherPoint = newState.points.find((p) => p.id === otherPointId);
    if (!otherPoint || !seg.fixedLength) continue;

    if (otherPoint.locked) {
      lockedConstraints.push({ centerId: otherPointId, radius: seg.fixedLength });
    } else {
      freeConstraints.push({ segId: seg.id, otherPointId, fixedLength: seg.fixedLength });
    }
  }

  // Resolve locked constraints: constrain moved point
  if (lockedConstraints.length === 1) {
    // Single locked constraint: project onto circle
    const c = lockedConstraints[0]!;
    const center = newState.points.find((p) => p.id === c.centerId)!;
    const movedPoint = newState.points.find((p) => p.id === pointId)!;
    const dist = distance(movedPoint, center);
    if (dist > 0) {
      const ratio = c.radius / dist;
      newState = updatePointPosition(
        newState,
        pointId,
        center.x + (movedPoint.x - center.x) * ratio,
        center.y + (movedPoint.y - center.y) * ratio,
      );
    }
  } else if (lockedConstraints.length >= 2) {
    // Multiple locked constraints: find intersection of circles
    const c1 = lockedConstraints[0]!;
    const c2 = lockedConstraints[1]!;
    const center1 = newState.points.find((p) => p.id === c1.centerId)!;
    const center2 = newState.points.find((p) => p.id === c2.centerId)!;
    const intersection = circleCircleIntersection(center1, c1.radius, center2, c2.radius);

    if (intersection) {
      // Pick the intersection point closest to the desired position
      const movedPoint = newState.points.find((p) => p.id === pointId)!;
      const d1 = distance(movedPoint, intersection[0]);
      const d2 = distance(movedPoint, intersection[1]);
      const best = d1 <= d2 ? intersection[0] : intersection[1];
      newState = updatePointPosition(newState, pointId, best.x, best.y);
    } else {
      // No intersection: project onto the first circle (best effort)
      const center = newState.points.find((p) => p.id === c1.centerId)!;
      const movedPoint = newState.points.find((p) => p.id === pointId)!;
      const dist = distance(movedPoint, center);
      if (dist > 0) {
        const ratio = c1.radius / dist;
        newState = updatePointPosition(
          newState,
          pointId,
          center.x + (movedPoint.x - center.x) * ratio,
          center.y + (movedPoint.y - center.y) * ratio,
        );
      }
    }
  }

  // Resolve free constraints: pivot other endpoints
  for (const fc of freeConstraints) {
    const movedPoint = newState.points.find((p) => p.id === pointId)!;
    const otherPoint = newState.points.find((p) => p.id === fc.otherPointId)!;
    const dist = distance(movedPoint, otherPoint);
    if (dist === 0) continue;
    const dx = otherPoint.x - movedPoint.x;
    const dy = otherPoint.y - movedPoint.y;
    newState = updatePointPosition(
      newState,
      fc.otherPointId,
      movedPoint.x + (dx / dist) * fc.fixedLength,
      movedPoint.y + (dy / dist) * fc.fixedLength,
    );
  }

  return newState;
}

/** Find intersection points of two circles. Returns null if no intersection. */
function circleCircleIntersection(
  c1: { x: number; y: number },
  r1: number,
  c2: { x: number; y: number },
  r2: number,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  const d = distance(c1, c2);
  if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) return null;

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));

  const mx = c1.x + (a * (c2.x - c1.x)) / d;
  const my = c1.y + (a * (c2.y - c1.y)) / d;

  return [
    { x: mx + (h * (c2.y - c1.y)) / d, y: my - (h * (c2.x - c1.x)) / d },
    { x: mx - (h * (c2.y - c1.y)) / d, y: my + (h * (c2.x - c1.x)) / d },
  ];
}

/** Fix a segment to an exact length by moving the endpoint. */
export function fixSegmentLength(
  state: ConstructionState,
  segmentId: string,
  lengthMm: number,
): ConstructionState {
  const segment = state.segments.find((s) => s.id === segmentId);
  if (!segment) return state;

  const startPoint = state.points.find((p) => p.id === segment.startPointId);
  const endPoint = state.points.find((p) => p.id === segment.endPointId);
  if (!startPoint || !endPoint) return state;

  const currentLength = distance(startPoint, endPoint);
  if (currentLength === 0) return state;

  const ratio = lengthMm / currentLength;
  const newEndX = startPoint.x + (endPoint.x - startPoint.x) * ratio;
  const newEndY = startPoint.y + (endPoint.y - startPoint.y) * ratio;

  const stateAfterMove = updatePointPosition(state, endPoint.id, newEndX, newEndY);

  // Mark as fixed length
  return {
    ...stateAfterMove,
    segments: stateAfterMove.segments.map((s) =>
      s.id === segmentId ? { ...s, fixedLength: lengthMm } : s,
    ),
  };
}

/** Remove fixedLength constraint from a segment. */
export function unfixSegmentLength(state: ConstructionState, segmentId: string): ConstructionState {
  const segment = state.segments.find((s) => s.id === segmentId);
  if (!segment || segment.fixedLength == null) return state;

  return {
    ...state,
    segments: state.segments.map((s) => {
      if (s.id !== segmentId) return s;
      const { fixedLength: _, ...rest } = s;
      return rest;
    }),
  };
}

/**
 * Split a segment at a T-junction point (spec §17).
 * Creates a new point on the segment body and splits the original
 * segment into two new segments sharing the new point.
 */
export function splitSegmentAtPoint(
  state: ConstructionState,
  segmentId: string,
  x: number,
  y: number,
  existingPointId?: string,
): { state: ConstructionState; pointId: string } | null {
  const segment = state.segments.find((s) => s.id === segmentId);
  if (!segment) return null;

  // Reuse existing point if provided (auto-intersection sharing)
  let stateWithPoint: ConstructionState;
  let pointId: string;
  if (existingPointId) {
    if (!state.points.some((p) => p.id === existingPointId)) return null;
    stateWithPoint = state;
    pointId = existingPointId;
  } else {
    const result = addPoint(state, x, y);
    stateWithPoint = result.state;
    pointId = result.pointId;
  }

  // Remove original segment
  const stateWithoutSeg = {
    ...stateWithPoint,
    segments: stateWithPoint.segments.filter((s) => s.id !== segmentId),
  };

  // Create two new segments
  const seg1 = addSegment(stateWithoutSeg, segment.startPointId, pointId);
  if (!seg1) return null;

  const seg2 = addSegment(seg1.state, pointId, segment.endPointId);
  if (!seg2) return null;

  return { state: seg2.state, pointId };
}

// ── Parameter changes (NOT pushed to undo) ────────────────

export function setGridSize(state: ConstructionState, gridSizeMm: GridSize): ConstructionState {
  return { ...state, gridSizeMm };
}

export function setDisplayMode(
  state: ConstructionState,
  displayMode: DisplayMode,
): ConstructionState {
  return { ...state, displayMode };
}

export function setDisplayUnit(
  state: ConstructionState,
  displayUnit: DisplayUnit,
): ConstructionState {
  return { ...state, displayUnit };
}

export function setActiveTool(state: ConstructionState, activeTool: ToolType): ConstructionState {
  return { ...state, activeTool };
}

export function setSnapEnabled(state: ConstructionState, snapEnabled: boolean): ConstructionState {
  return { ...state, snapEnabled };
}

export function setSelectedElement(
  state: ConstructionState,
  selectedElementId: string | null,
): ConstructionState {
  return { ...state, selectedElementId };
}

// ── Geometric toggle (pushed to undo) ─────────────────────

export function togglePointLock(state: ConstructionState, pointId: string): ConstructionState {
  return {
    ...state,
    points: state.points.map((p) => (p.id === pointId ? { ...p, locked: !p.locked } : p)),
  };
}

// ── TextBox CRUD (pushed to undo) ─────────────────────────

export function createTextBox(
  state: ConstructionState,
  x: number,
  y: number,
): { state: ConstructionState; textBoxId: string } {
  const id = generateId();
  const tb: TextBox = { id, x, y, text: '' };
  return { state: { ...state, textBoxes: [...state.textBoxes, tb] }, textBoxId: id };
}

export function updateTextBox(
  state: ConstructionState,
  id: string,
  text: string,
): ConstructionState {
  return {
    ...state,
    textBoxes: state.textBoxes.map((tb) => (tb.id === id ? { ...tb, text } : tb)),
  };
}

export function moveTextBox(
  state: ConstructionState,
  id: string,
  x: number,
  y: number,
): ConstructionState {
  return {
    ...state,
    textBoxes: state.textBoxes.map((tb) => (tb.id === id ? { ...tb, x, y } : tb)),
  };
}

export function deleteTextBox(state: ConstructionState, id: string): ConstructionState {
  return { ...state, textBoxes: state.textBoxes.filter((tb) => tb.id !== id) };
}
