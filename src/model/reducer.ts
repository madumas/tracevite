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
import type { TextBox, ConstructionState } from './types';
import * as State from './state';
import * as Undo from './undo';
import { reflectConstruction, reflectPoint } from '@/engine/reflection';
import { generateId } from './id';
import { reproduceElements, reproduceFrieze } from '@/engine/reproduce';
import { rotateConstruction, rotatePoint } from '@/engine/rotation';
import { scaleConstruction, scalePoint } from '@/engine/homothety';
import { pointOnSegmentProjection, segmentIntersection } from '@/engine/geometry';
import { MIN_POINT_DISTANCE_MM } from '@/config/accessibility';

/**
 * Apply a 2D transform to a set of textBoxes, creating new textBoxes with
 * transformed positions but **unchanged text**. Accessibility rule (ergo +
 * pédago + UX reviews, QA 1.16): the glyphs themselves must stay readable —
 * we never mirror, rotate or scale the font. Only the anchor point moves.
 */
function transformTextBoxes(
  state: ConstructionState,
  textBoxIds: readonly string[] | undefined,
  transform: (p: { x: number; y: number }) => { x: number; y: number },
): TextBox[] {
  if (!textBoxIds || textBoxIds.length === 0) return [];
  const result: TextBox[] = [];
  for (const id of textBoxIds) {
    const src = state.textBoxes.find((t) => t.id === id);
    if (!src) continue;
    const pos = transform({ x: src.x, y: src.y });
    result.push({ id: generateId(), x: pos.x, y: pos.y, text: src.text });
  }
  return result;
}

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
  | { type: 'SET_SEGMENT_COLOR'; segmentId: string; colorIndex: number | undefined }
  | { type: 'SET_CIRCLE_COLOR'; circleId: string; colorIndex: number | undefined }
  | { type: 'MOVE_POINT'; pointId: string; x: number; y: number }
  | { type: 'CREATE_CIRCLE'; centerPointId: string; radiusMm: number }
  | { type: 'SET_CIRCLE_RADIUS'; circleId: string; radiusMm: number }
  | {
      type: 'REFLECT_ELEMENTS';
      pointIds: string[];
      segmentIds: string[];
      circleIds?: string[];
      textBoxIds?: readonly string[];
      axisP1: { x: number; y: number };
      axisP2: { x: number; y: number };
    }
  | { type: 'SPLIT_SEGMENT'; segmentId: string; x: number; y: number }
  | {
      type: 'REPRODUCE_ELEMENTS';
      pointIds: readonly string[];
      segmentIds: readonly string[];
      circleIds: readonly string[];
      textBoxIds?: readonly string[];
      offsetX: number;
      offsetY: number;
    }
  | {
      type: 'REPRODUCE_FRIEZE';
      pointIds: readonly string[];
      segmentIds: readonly string[];
      circleIds: readonly string[];
      textBoxIds?: readonly string[];
      vector1: { dx: number; dy: number };
      count1: number;
      vector2?: { dx: number; dy: number };
      count2?: number;
    }
  | {
      type: 'ROTATE_ELEMENTS';
      pointIds: readonly string[];
      segmentIds: readonly string[];
      circleIds: readonly string[];
      textBoxIds?: readonly string[];
      center: { x: number; y: number };
      angleDeg: number;
    }
  | {
      type: 'SCALE_ELEMENTS';
      pointIds: readonly string[];
      segmentIds: readonly string[];
      circleIds: readonly string[];
      textBoxIds?: readonly string[];
      center: { x: number; y: number };
      factor: number;
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
  | { type: 'CREATE_TEXT_BOX'; x: number; y: number }
  | { type: 'UPDATE_TEXT_BOX'; id: string; text: string }
  | { type: 'MOVE_TEXT_BOX'; id: string; x: number; y: number }
  | { type: 'DELETE_TEXT_BOX'; id: string }
  | { type: 'SET_TOLERANCE_PROFILE'; toleranceProfile: ToleranceProfile }
  | { type: 'SET_CHAIN_TIMEOUT'; chainTimeoutMs: ChainTimeout }
  | { type: 'SET_FONT_SCALE'; fontScale: FontScale }
  | { type: 'SET_CLUTTER_THRESHOLD'; clutterThreshold: number }
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
            const splitResult = State.splitSegmentAtPoint(newState, seg.id, pt.x, pt.y, newPtId);
            if (splitResult) newState = splitResult.state;
            break; // one split per point max
          }
        }
      }

      // Auto-intersection detection (opt-in, spec §19 v2)
      // TODO: multi-intersection (segment crossing 3+ existing segments) only handles
      // the first crossing — after the first split, result.segmentId no longer exists.
      if (current.autoIntersection) {
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
                    const split2 = State.splitSegmentAtPoint(
                      newState,
                      seg.id,
                      jp.x,
                      jp.y,
                      junctionPointId,
                    );
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

    case 'SET_SEGMENT_COLOR': {
      const newState = State.setSegmentColor(current, action.segmentId, action.colorIndex);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'SET_CIRCLE_COLOR': {
      const newState = State.setCircleColor(current, action.circleId, action.colorIndex);
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
      const opId = `reflection-${generateId()}`;
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
        opId,
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

      // Reflect textBoxes: position mirrors across axis, text stays readable.
      const newTextBoxes = transformTextBoxes(current, action.textBoxIds, (p) =>
        reflectPoint(p, action.axisP1, action.axisP2),
      );

      const newState: typeof current = {
        ...current,
        points: [...current.points, ...newPoints],
        segments: [...current.segments, ...newSegments],
        circles: [...current.circles, ...newCircles],
        textBoxes: [...current.textBoxes, ...newTextBoxes],
      };
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'REPRODUCE_FRIEZE': {
      const opId = `frieze-${generateId()}`;
      const result = reproduceFrieze(
        action.pointIds,
        action.segmentIds,
        action.circleIds,
        current,
        action.vector1,
        action.count1,
        action.vector2,
        action.count2,
        opId,
      );
      if (result.points.length === 0) return state;

      // Frieze textBoxes: replicate at each translated copy (skip the (0,0) unit
      // copy, same convention as reproduceFrieze).
      const friezeTextBoxes: TextBox[] = [];
      if (action.textBoxIds && action.textBoxIds.length > 0) {
        const v1 = action.vector1;
        const v2 = action.vector2 ?? { dx: 0, dy: 0 };
        const c2 = action.vector2 ? (action.count2 ?? 1) : 1;
        for (let i = 0; i < action.count1; i++) {
          for (let j = 0; j < c2; j++) {
            if (i === 0 && j === 0) continue;
            const dx = i * v1.dx + j * v2.dx;
            const dy = i * v1.dy + j * v2.dy;
            friezeTextBoxes.push(
              ...transformTextBoxes(current, action.textBoxIds, (p) => ({
                x: p.x + dx,
                y: p.y + dy,
              })),
            );
          }
        }
      }

      const newState: typeof current = {
        ...current,
        points: [...current.points, ...result.points],
        segments: [...current.segments, ...result.segments],
        circles: [...current.circles, ...result.circles],
        textBoxes: [...current.textBoxes, ...friezeTextBoxes],
      };
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'REPRODUCE_ELEMENTS': {
      const opId = `reproduce-${generateId()}`;
      const result = reproduceElements(
        action.pointIds,
        action.segmentIds,
        action.circleIds,
        current,
        action.offsetX,
        action.offsetY,
        [],
        undefined,
        opId,
      );
      const newTextBoxes = transformTextBoxes(current, action.textBoxIds, (p) => ({
        x: p.x + action.offsetX,
        y: p.y + action.offsetY,
      }));
      const newState: typeof current = {
        ...current,
        points: [...current.points, ...result.points],
        segments: [...current.segments, ...result.segments],
        circles: [...current.circles, ...result.circles],
        textBoxes: [...current.textBoxes, ...newTextBoxes],
      };
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'ROTATE_ELEMENTS': {
      const opId = `rotation-${generateId()}`;
      const result = rotateConstruction(
        action.pointIds,
        action.segmentIds,
        action.circleIds,
        current,
        action.center,
        action.angleDeg,
        opId,
      );
      // Rotate textBox anchor positions but leave glyphs horizontal (readable).
      const newTextBoxes = transformTextBoxes(current, action.textBoxIds, (p) =>
        rotatePoint(p, action.center, action.angleDeg),
      );
      const newState: typeof current = {
        ...current,
        points: [...current.points, ...result.points],
        segments: [...current.segments, ...result.segments],
        circles: [...current.circles, ...result.circles],
        textBoxes: [...current.textBoxes, ...newTextBoxes],
      };
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'SCALE_ELEMENTS': {
      const opId = `scale-${generateId()}`;
      const result = scaleConstruction(
        action.pointIds,
        action.segmentIds,
        action.circleIds,
        current,
        action.center,
        action.factor,
        opId,
      );
      // Scale textBox anchor position but keep the font size fixed (>13px
      // minimum accessibility — we don't honour factor on the glyph itself).
      const newTextBoxes = transformTextBoxes(current, action.textBoxIds, (p) =>
        scalePoint(p, action.center, action.factor),
      );
      const newState: typeof current = {
        ...current,
        points: [...current.points, ...result.points],
        segments: [...current.segments, ...result.segments],
        circles: [...current.circles, ...result.circles],
        textBoxes: [...current.textBoxes, ...newTextBoxes],
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

    case 'SET_DISPLAY_MODE': {
      const updated = State.setDisplayMode(current, action.displayMode);
      // Respect user's explicit toggle; otherwise apply mode default (épuré in Simplifié)
      const hideProperties = current.hidePropertiesUserSet
        ? current.hideProperties
        : action.displayMode === 'simplifie';
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...updated,
          hideProperties,
        }),
      };
    }

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

    case 'SET_SELECTED_ELEMENT': {
      // Validate that the id refers to an element that actually exists — the
      // reducer should never hold a phantom selection that the UI then tries
      // to render action buttons for. (QA 1.20)
      const id = action.elementId;
      if (id !== null) {
        const exists =
          current.points.some((p) => p.id === id) ||
          current.segments.some((s) => s.id === id) ||
          current.circles.some((c) => c.id === id) ||
          current.textBoxes.some((t) => t.id === id);
        if (!exists) return state;
      }
      return {
        undoManager: Undo.updateCurrent(undoManager, State.setSelectedElement(current, id)),
      };
    }

    case 'TOGGLE_POINT_LOCK': {
      const newState = State.togglePointLock(current, action.pointId);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'CREATE_TEXT_BOX': {
      const result = State.createTextBox(current, action.x, action.y);
      return { undoManager: Undo.pushState(undoManager, result.state) };
    }

    case 'UPDATE_TEXT_BOX': {
      const newState = State.updateTextBox(current, action.id, action.text);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'MOVE_TEXT_BOX': {
      const newState = State.moveTextBox(current, action.id, action.x, action.y);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'DELETE_TEXT_BOX': {
      const newState = State.deleteTextBox(current, action.id);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'SET_HIDE_PROPERTIES':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          hideProperties: action.hide,
          hidePropertiesUserSet: true,
        }),
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

    case 'SET_CLUTTER_THRESHOLD':
      return {
        undoManager: Undo.updateCurrent(undoManager, {
          ...current,
          clutterThreshold: action.clutterThreshold,
        }),
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
    // Preserve `activeTool` from the current state rather than the historical
    // snapshot. Otherwise an undo after LOAD_CONSTRUCTION could surface an
    // unexpected tool (e.g. « reflection » mid-session) to the child. (QA 1.15)
    case 'UNDO': {
      const undone = Undo.undo(undoManager);
      return {
        undoManager: {
          ...undone,
          current: {
            ...undone.current,
            selectedElementId: null,
            activeTool: current.activeTool,
          },
        },
      };
    }

    case 'REDO': {
      const redone = Undo.redo(undoManager);
      return {
        undoManager: {
          ...redone,
          current: {
            ...redone.current,
            selectedElementId: null,
            activeTool: current.activeTool,
          },
        },
      };
    }

    // ── Load / New ─────────────────────────────────────
    case 'LOAD_CONSTRUCTION':
      return { undoManager: action.undoManager };

    case 'NEW_CONSTRUCTION': {
      return {
        undoManager: Undo.createUndoManager({
          ...State.createInitialState(),
          // Preserve user config from current state
          gridSizeMm: current.gridSizeMm,
          snapEnabled: current.snapEnabled,
          displayMode: current.displayMode,
          displayUnit: current.displayUnit,
          // Preserve user accessibility toggles (student reglages)
          hideProperties: current.hideProperties,
          hidePropertiesUserSet: current.hidePropertiesUserSet,
          estimationMode: current.estimationMode,
          toleranceProfile: current.toleranceProfile,
          chainTimeoutMs: current.chainTimeoutMs,
          fontScale: current.fontScale,
          keyboardShortcutsEnabled: current.keyboardShortcutsEnabled,
          soundMode: current.soundMode,
          soundGain: current.soundGain,
          pointToolVisible: current.pointToolVisible,
          cartesianMode: current.cartesianMode,
          autoIntersection: current.autoIntersection,
          clutterThreshold: current.clutterThreshold,
          // consigne is NOT preserved — teacher assignment resets for new construction
        }),
      };
    }
  }
}
