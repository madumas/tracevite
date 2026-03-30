/**
 * Pure state transition functions.
 * Every function: (state, params) → newState. No mutation, no side effects.
 */

import type {
  ConstructionState,
  GridSize,
  SchoolLevel,
  DisplayUnit,
  ToolType,
  Point,
  Segment,
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
    gridSizeMm: 10, // 1cm default
    snapEnabled: true,
    activeTool: 'segment',
    schoolLevel: '2e_cycle',
    displayUnit: 'cm',
    selectedElementId: null,
    consigne: null,
    hideProperties: false,
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

  for (const seg of connectedFixedSegments) {
    const otherPointId = seg.startPointId === pointId ? seg.endPointId : seg.startPointId;
    const movedPoint = newState.points.find((p) => p.id === pointId);
    const otherPoint = newState.points.find((p) => p.id === otherPointId);
    if (!movedPoint || !otherPoint || !seg.fixedLength) continue;

    if (otherPoint.locked) {
      // Constrain the moved point to circle of fixedLength around locked point
      const dist = distance(movedPoint, otherPoint);
      if (dist === 0) continue;
      const ratio = seg.fixedLength / dist;
      const constrainedX = otherPoint.x + (movedPoint.x - otherPoint.x) * ratio;
      const constrainedY = otherPoint.y + (movedPoint.y - otherPoint.y) * ratio;
      newState = updatePointPosition(newState, pointId, constrainedX, constrainedY);
    } else {
      // Pivot other endpoint to maintain fixedLength along current direction
      const dist = distance(movedPoint, otherPoint);
      if (dist === 0) continue;
      const dx = otherPoint.x - movedPoint.x;
      const dy = otherPoint.y - movedPoint.y;
      const newOtherX = movedPoint.x + (dx / dist) * seg.fixedLength;
      const newOtherY = movedPoint.y + (dy / dist) * seg.fixedLength;
      newState = updatePointPosition(newState, otherPointId, newOtherX, newOtherY);
    }
  }

  return newState;
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
): { state: ConstructionState; pointId: string } | null {
  const segment = state.segments.find((s) => s.id === segmentId);
  if (!segment) return null;

  // Create the junction point
  const { state: stateWithPoint, pointId } = addPoint(state, x, y);

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

export function setSchoolLevel(
  state: ConstructionState,
  schoolLevel: SchoolLevel,
): ConstructionState {
  return { ...state, schoolLevel };
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
