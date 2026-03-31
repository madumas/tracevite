/**
 * Construction reducer — single source of truth for action types.
 * Geometric actions push to undo. Parameter changes do not.
 */

import type {
  GridSize,
  DisplayMode,
  DisplayUnit,
  ToolType,
  ToleranceProfile,
  ChainTimeout,
  FontScale,
  SoundMode,
} from './types';
import type { UndoManager } from './undo';
import * as State from './state';
import * as Undo from './undo';
import { reflectConstruction } from '@/engine/reflection';
import { generateId } from './id';
import { reproduceElements } from '@/engine/reproduce';
import { pointOnSegmentProjection, segmentIntersection } from '@/engine/geometry';
import { MIN_POINT_DISTANCE_MM } from '@/config/accessibility';

// ── Action types ──────────────────────────────────────────

export type ConstructionAction =
  | {
      type: 'CREATE_SEGMENT';
      start: { x: number; y: number; existingPointId?: string };
      end: { x: number; y: number; existingPointId?: string };
    }
  | { type: 'CREATE_POINT'; x: number; y: number }
  | { type: 'REMOVE_ELEMENT'; elementId: string }
  | { type: 'UPDATE_POINT_POSITION'; pointId: string; x: number; y: number }
  | { type: 'FIX_SEGMENT_LENGTH'; segmentId: string; lengthMm: number }
  | { type: 'UNFIX_SEGMENT_LENGTH'; segmentId: string }
  | { type: 'MOVE_POINT'; pointId: string; x: number; y: number }
  | { type: 'CREATE_CIRCLE'; centerPointId: string; radiusMm: number }
  | { type: 'SET_CIRCLE_RADIUS'; circleId: string; radiusMm: number }
  | {
      type: 'REFLECT_ELEMENTS';
      pointIds: string[];
      segmentIds: string[];
      circleIds?: string[];
      axisP1: { x: number; y: number };
      axisP2: { x: number; y: number };
    }
  | { type: 'SPLIT_SEGMENT'; segmentId: string; x: number; y: number }
  | {
      type: 'REPRODUCE_ELEMENTS';
      pointIds: readonly string[];
      segmentIds: readonly string[];
      circleIds: readonly string[];
      offsetX: number;
      offsetY: number;
    }
  | { type: 'SET_GRID_SIZE'; gridSizeMm: GridSize }
  | { type: 'SET_DISPLAY_MODE'; displayMode: DisplayMode }
  | { type: 'SET_DISPLAY_UNIT'; displayUnit: DisplayUnit }
  | { type: 'SET_ACTIVE_TOOL'; activeTool: ToolType }
  | { type: 'SET_SNAP_ENABLED'; snapEnabled: boolean }
  | { type: 'SET_SELECTED_ELEMENT'; elementId: string | null }
  | { type: 'TOGGLE_POINT_LOCK'; pointId: string }
  | { type: 'SET_HIDE_PROPERTIES'; hide: boolean }
  | { type: 'SET_CONSIGNE'; consigne: string | null }
  | { type: 'SET_TOLERANCE_PROFILE'; toleranceProfile: ToleranceProfile }
  | { type: 'SET_CHAIN_TIMEOUT'; chainTimeoutMs: ChainTimeout }
  | { type: 'SET_FONT_SCALE'; fontScale: FontScale }
  | { type: 'SET_KEYBOARD_SHORTCUTS'; enabled: boolean }
  | { type: 'SET_SOUND_MODE'; soundMode: SoundMode }
  | { type: 'SET_SOUND_GAIN'; soundGain: number }
  | { type: 'SET_POINT_TOOL_VISIBLE'; visible: boolean }
  | { type: 'SET_ESTIMATION_MODE'; enabled: boolean }
  | { type: 'SET_CARTESIAN_MODE'; mode: import('./types').CartesianMode }
  | { type: 'SET_AUTO_INTERSECTION'; enabled: boolean }
  | { type: 'LOAD_CONSTRUCTION'; undoManager: UndoManager }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'NEW_CONSTRUCTION' };

/** Result of a reducer dispatch. */
export interface ReducerState {
  readonly undoManager: UndoManager;
}

/** Reduce an action, returning updated undo manager. */
export function reduce(state: ReducerState, action: ConstructionAction): ReducerState {
  const { undoManager } = state;
  const current = undoManager.current;

  switch (action.type) {
    // ── Geometric actions (push to undo) ──────────────
    case 'CREATE_POINT': {
      const result = State.addPoint(current, action.x, action.y);
      return { undoManager: Undo.pushState(undoManager, result.state) };
    }

    case 'CREATE_SEGMENT': {
      const result = State.createSegment(current, action.start, action.end);
      if (!result) return state; // silently reject

      // T-junction auto-split (spec §17): if a new point lands on existing segment body
      let newState = result.state;
      const pointMap = new Map(newState.points.map((p) => [p.id, p]));
      for (const newPtId of [result.startPointId, result.endPointId]) {
        const pt = pointMap.get(newPtId);
        if (!pt) continue;
        for (const seg of newState.segments) {
          if (seg.id === result.segmentId) continue; // skip the just-created segment
          if (seg.startPointId === newPtId || seg.endPointId === newPtId) continue; // already endpoint
          const sp = pointMap.get(seg.startPointId);
          const ep = pointMap.get(seg.endPointId);
          if (!sp || !ep) continue;
          const { distance: dist } = pointOnSegmentProjection(pt, sp, ep);
          if (dist < MIN_POINT_DISTANCE_MM) {
            const splitResult = State.splitSegmentAtPoint(newState, seg.id, pt.x, pt.y);
            if (splitResult) newState = splitResult.state;
            break; // one split per point max
          }
        }
      }

      // Auto-intersection detection (opt-in, spec §19 v2)
      if (current.autoIntersection) {
        // Collect all intersection points first, then split in a second pass
        const pm = new Map(newState.points.map((p) => [p.id, p]));
        const createdSeg = newState.segments.find((s) => s.id === result.segmentId);
        if (createdSeg) {
          const cs = pm.get(createdSeg.startPointId);
          const ce = pm.get(createdSeg.endPointId);
          if (cs && ce) {
            const existingSegIds = newState.segments
              .filter((s) => s.id !== result.segmentId)
              .map((s) => s.id);

            for (const otherId of existingSegIds) {
              const other = newState.segments.find((s) => s.id === otherId);
              if (!other) continue;
              const opm = new Map(newState.points.map((p) => [p.id, p]));
              const os = opm.get(other.startPointId);
              const oe = opm.get(other.endPointId);
              if (!os || !oe) continue;
              const ix = segmentIntersection(cs, ce, os, oe);
              if (!ix) continue;

              // Split the existing segment — creates the intersection point
              const splitResult = State.splitSegmentAtPoint(newState, otherId, ix.x, ix.y);
              if (!splitResult) continue;
              newState = splitResult.state;
              const junctionPointId = splitResult.pointId;

              // Find which sub-segment of the new segment contains the junction point
              // and split it using the SAME point (connect to existing junction)
              // Find segments from the original creation that span the intersection
              for (const seg of [...newState.segments]) {
                if (
                  seg.startPointId === result.startPointId ||
                  seg.endPointId === result.startPointId ||
                  seg.startPointId === result.endPointId ||
                  seg.endPointId === result.endPointId
                ) {
                  // This segment is part of the original new segment (or its splits)
                  if (seg.startPointId === junctionPointId || seg.endPointId === junctionPointId)
                    continue;
                  const sp = newState.points.find((p) => p.id === seg.startPointId);
                  const ep = newState.points.find((p) => p.id === seg.endPointId);
                  const jp = newState.points.find((p) => p.id === junctionPointId);
                  if (!sp || !ep || !jp) continue;
                  const { distance: dist } = pointOnSegmentProjection(jp, sp, ep);
                  if (dist < MIN_POINT_DISTANCE_MM) {
                    const split2 = State.splitSegmentAtPoint(newState, seg.id, jp.x, jp.y);
                    if (split2) newState = split2.state;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'REMOVE_ELEMENT': {
      const newState = State.removeElement(current, action.elementId);
      if (newState === current) return state;
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'UPDATE_POINT_POSITION': {
      const newState = State.updatePointPosition(current, action.pointId, action.x, action.y);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'MOVE_POINT': {
      const newState = State.movePointWithConstraints(current, action.pointId, action.x, action.y);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'FIX_SEGMENT_LENGTH': {
      const newState = State.fixSegmentLength(current, action.segmentId, action.lengthMm);
      if (newState === current) return state;
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'UNFIX_SEGMENT_LENGTH': {
      const newState = State.unfixSegmentLength(current, action.segmentId);
      if (newState === current) return state;
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'CREATE_CIRCLE': {
      const result = State.addCircle(current, action.centerPointId, action.radiusMm);
      if (!result) return state;
      return { undoManager: Undo.pushState(undoManager, result.state) };
    }

    case 'SET_CIRCLE_RADIUS': {
      const newState = State.setCircleRadius(current, action.circleId, action.radiusMm);
      if (newState === current) return state;
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'REFLECT_ELEMENTS': {
      const {
        points: newPoints,
        segments: newSegments,
        pointIdMap,
      } = reflectConstruction(
        action.pointIds,
        action.segmentIds,
        current,
        action.axisP1,
        action.axisP2,
      );

      // Reflect circles: create new circle with reflected center and same radius
      const newCircles = (action.circleIds ?? [])
        .map((cid) => {
          const original = current.circles.find((c) => c.id === cid);
          if (!original) return null;
          const newCenterId = pointIdMap.get(original.centerPointId);
          if (!newCenterId) return null;
          return {
            id: generateId(),
            centerPointId: newCenterId,
            radiusMm: original.radiusMm,
          };
        })
        .filter(Boolean) as (typeof current.circles)[number][];

      const newState: typeof current = {
        ...current,
        points: [...current.points, ...newPoints],
        segments: [...current.segments, ...newSegments],
        circles: [...current.circles, ...newCircles],
      };
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'REPRODUCE_ELEMENTS': {
      const result = reproduceElements(
        action.pointIds,
        action.segmentIds,
        action.circleIds,
        current,
        action.offsetX,
        action.offsetY,
      );
      const newState: typeof current = {
        ...current,
        points: [...current.points, ...result.points],
        segments: [...current.segments, ...result.segments],
        circles: [...current.circles, ...result.circles],
      };
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'SPLIT_SEGMENT': {
      const result = State.splitSegmentAtPoint(current, action.segmentId, action.x, action.y);
      if (!result) return state;
      return { undoManager: Undo.pushState(undoManager, result.state) };
    }

    // ── Parameter changes (no undo push) ──────────────
    case 'SET_GRID_SIZE':
      return {
        undoManager: Undo.updateCurrent(undoManager, State.setGridSize(current, action.gridSizeMm)),
      };

    case 'SET_DISPLAY_MODE':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setDisplayMode(current, action.displayMode),
        ),
      };

    case 'SET_DISPLAY_UNIT':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setDisplayUnit(current, action.displayUnit),
        ),
      };

    case 'SET_ACTIVE_TOOL':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setActiveTool(current, action.activeTool),
        ),
      };

    case 'SET_SNAP_ENABLED':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setSnapEnabled(current, action.snapEnabled),
        ),
      };

    case 'SET_SELECTED_ELEMENT':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setSelectedElement(current, action.elementId),
        ),
      };

    case 'TOGGLE_POINT_LOCK': {
      const newState = State.togglePointLock(current, action.pointId);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'SET_HIDE_PROPERTIES':
      return {
        undoManager: Undo.updateCurrent(undoManager, { ...current, hideProperties: action.hide }),
      };

    case 'SET_CONSIGNE':
      return {
        undoManager: Undo.updateCurrent(undoManager, { ...current, consigne: action.consigne }),
      };

    case 'SET_TOLERANCE_PROFILE':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          toleranceProfile: action.toleranceProfile,
        }),
      };

    case 'SET_CHAIN_TIMEOUT':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          chainTimeoutMs: action.chainTimeoutMs,
        }),
      };

    case 'SET_FONT_SCALE':
      return {
        undoManager: Undo.updateCurrent(undoManager, { ...current, fontScale: action.fontScale }),
      };

    case 'SET_KEYBOARD_SHORTCUTS':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          keyboardShortcutsEnabled: action.enabled,
        }),
      };

    case 'SET_SOUND_MODE':
      return {
        undoManager: Undo.updateCurrent(undoManager, { ...current, soundMode: action.soundMode }),
      };

    case 'SET_SOUND_GAIN':
      return {
        undoManager: Undo.updateCurrent(undoManager, { ...current, soundGain: action.soundGain }),
      };

    case 'SET_POINT_TOOL_VISIBLE':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          pointToolVisible: action.visible,
        }),
      };

    case 'SET_ESTIMATION_MODE':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          estimationMode: action.enabled,
        }),
      };

    case 'SET_CARTESIAN_MODE':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          cartesianMode: action.mode,
        }),
      };

    case 'SET_AUTO_INTERSECTION':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          autoIntersection: action.enabled,
        }),
      };

    // ── Undo/Redo ─────────────────────────────────────
    case 'UNDO':
      return { undoManager: Undo.undo(undoManager) };

    case 'REDO':
      return { undoManager: Undo.redo(undoManager) };

    // ── Load / New ─────────────────────────────────────
    case 'LOAD_CONSTRUCTION':
      return { undoManager: action.undoManager };

    case 'NEW_CONSTRUCTION':
      return { undoManager: Undo.createUndoManager(State.createInitialState()) };
  }
}
