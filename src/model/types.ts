// ============================================================
// TraceVite — Complete data model (all milestones)
// Internal unit: millimeters (mm) for all coordinates and lengths
// ============================================================

/** A point on the construction canvas. */
export interface Point {
  readonly id: string;
  readonly x: number; // mm
  readonly y: number; // mm
  readonly label: string; // "A", "B", ... "Z", "AA", "AB", ...
  readonly locked: boolean;
}

/** A segment connecting two points. */
export interface Segment {
  readonly id: string;
  readonly startPointId: string;
  readonly endPointId: string;
  readonly lengthMm: number; // computed, stored for quick access
  readonly fixedLength?: number; // mm — when user fixes exact length
}

/** A circle defined by center and radius. */
export interface Circle {
  readonly id: string;
  readonly centerPointId: string;
  readonly radiusMm: number;
}

/** Angle classification per PFEQ vocabulary. */
export type AngleClassification = 'aigu' | 'droit' | 'obtus' | 'plat' | 'reflex';

/** Detected angle at a vertex (computed, not serialized). */
export interface AngleInfo {
  readonly vertexPointId: string;
  readonly ray1PointId: string;
  readonly ray2PointId: string;
  readonly degrees: number;
  readonly classification: AngleClassification;
}

/** Type of detected geometric property. */
export type PropertyType = 'parallel' | 'perpendicular' | 'equal_length' | 'right_angle' | 'figure';

/** Detected geometric property (computed, not serialized). */
export interface DetectedProperty {
  readonly type: PropertyType;
  readonly involvedIds: readonly string[];
  readonly label: string; // e.g. "AB // CD", "Carré"
}

/** Display mode — adapts information density. */
export type DisplayMode = 'simplifie' | 'complet';

/** Display unit — internal is always mm. */
export type DisplayUnit = 'cm' | 'mm';

/** All available tool types. Only some active per milestone/level. */
export type ToolType =
  | 'segment'
  | 'point'
  | 'circle'
  | 'reflection'
  | 'move'
  | 'measure'
  | 'reproduce'
  | 'perpendicular'
  | 'parallel'
  | 'translation';

/** Selectable grid sizes in mm. */
export type GridSize = 5 | 10 | 20;

/** Font scale factor for accessibility. */
export type FontScale = 1 | 1.25 | 1.5;

/** Sound feedback mode. */
export type SoundMode = 'off' | 'reduced' | 'full';

/** Chaining timeout options in ms (0 = disabled). */
export type ChainTimeout = 0 | 5000 | 8000 | 15000;

/** Tolerance profile for snap distances. */
export type ToleranceProfile = 'default' | 'large' | 'very_large';

/** Cartesian plane mode. */
export type CartesianMode = 'off' | '1quadrant' | '4quadrants';

/** Segment tool state machine phases. */
export type SegmentToolPhase = 'idle' | 'first_point_placed' | 'segment_created';

/** Complete construction state — all fields present from day 1. */
export interface ConstructionState {
  readonly points: readonly Point[];
  readonly segments: readonly Segment[];
  readonly circles: readonly Circle[];
  readonly gridSizeMm: GridSize;
  readonly snapEnabled: boolean;
  readonly activeTool: ToolType;
  readonly displayMode: DisplayMode;
  readonly displayUnit: DisplayUnit;
  readonly selectedElementId: string | null;
  readonly consigne: string | null;
  readonly hideProperties: boolean;
  readonly toleranceProfile: ToleranceProfile;
  readonly chainTimeoutMs: ChainTimeout;
  readonly fontScale: FontScale;
  readonly keyboardShortcutsEnabled: boolean;
  readonly soundMode: SoundMode;
  readonly soundGain: number; // 0–1, default 0.5
  readonly pointToolVisible: boolean;
  readonly estimationMode: boolean;
  readonly cartesianMode: CartesianMode;
  readonly autoIntersection: boolean;
}

/** Snap result from the snap engine. */
export interface SnapResult {
  readonly snappedPosition: { readonly x: number; readonly y: number };
  readonly snapType:
    | 'point'
    | 'midpoint'
    | 'circumference'
    | 'grid'
    | 'angle'
    | 'alignment'
    | 'none';
  readonly snappedToPointId?: string;
  /** Guide type when angle snap matches parallel/perpendicular to existing segment. */
  readonly guideType?: 'parallel' | 'perpendicular';
  /** ID of the reference segment for the guide. */
  readonly guideSegmentId?: string;
}

/** Viewport/camera state for zoom and pan. */
export interface ViewportState {
  readonly panX: number; // mm offset
  readonly panY: number; // mm offset
  readonly zoom: number; // 0.5 to 2.0
}

/** Serialized file version for .tracevite files. */
export const FILE_VERSION = 2;
