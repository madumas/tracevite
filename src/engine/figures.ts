/**
 * Closed figure detection and classification.
 * Uses planar face traversal (leftmost-turn) to find minimal cycles.
 */

import type { ConstructionState, DisplayMode, Point } from '@/model/types';
import { distance } from './geometry';

/** Height data for triangle/parallelogram (complet mode). */
export interface FigureHeight {
  readonly baseLengthMm: number;
  readonly heightMm: number;
  readonly baseLabel: string;
  readonly vertexLabel: string;
  readonly footMm: { x: number; y: number };
  readonly vertexMm: { x: number; y: number };
  readonly isTriangle: boolean;
}

/** Detected figure (computed, not stored in state). */
export interface Figure {
  readonly id: string;
  readonly pointIds: readonly string[];
  readonly segmentIds: readonly string[];
  readonly name: string;
  readonly selfIntersecting: boolean;
  readonly height?: FigureHeight;
}

// ── Adjacency graph ──────────────────────────────────────

interface AdjEntry {
  neighborId: string;
  segmentId: string;
  angle: number; // atan2 from this point to neighbor
}

type AdjGraph = Map<string, AdjEntry[]>;

/** Build adjacency graph from construction state. Each point has neighbors sorted by angle. */
export function buildAdjacencyGraph(state: ConstructionState): AdjGraph {
  const graph: AdjGraph = new Map();
  const pointMap = new Map(state.points.map((p) => [p.id, p]));

  for (const seg of state.segments) {
    const start = pointMap.get(seg.startPointId);
    const end = pointMap.get(seg.endPointId);
    if (!start || !end) continue;

    const angleStartToEnd = Math.atan2(end.y - start.y, end.x - start.x);
    const angleEndToStart = Math.atan2(start.y - end.y, start.x - end.x);

    if (!graph.has(start.id)) graph.set(start.id, []);
    if (!graph.has(end.id)) graph.set(end.id, []);

    graph.get(start.id)!.push({ neighborId: end.id, segmentId: seg.id, angle: angleStartToEnd });
    graph.get(end.id)!.push({ neighborId: start.id, segmentId: seg.id, angle: angleEndToStart });
  }

  // Sort each adjacency list by angle
  for (const [, neighbors] of graph) {
    neighbors.sort((a, b) => a.angle - b.angle);
  }

  return graph;
}

/**
 * Leftmost-turn face traversal from a directed edge.
 * Starting from edge (fromId → toId), always turn as far left as possible.
 * Returns the face (sequence of point IDs) or null if traversal fails.
 */
export function leftmostTurn(graph: AdjGraph, fromId: string, toId: string): string[] | null {
  const face: string[] = [fromId];
  let prevId = fromId;
  let currentId = toId;
  const maxSteps = 100; // Safety: prevent infinite loops

  for (let step = 0; step < maxSteps; step++) {
    face.push(currentId);

    if (currentId === fromId) {
      // Completed the cycle
      return face.slice(0, -1); // Remove duplicate start point
    }

    const neighbors = graph.get(currentId);
    if (!neighbors || neighbors.length === 0) return null;

    // Find the entry for the edge we came from (current → prev)
    const prevEntry = neighbors.find((n) => n.neighborId === prevId);
    if (!prevEntry) return null;

    // Leftmost turn: pick the next neighbor in CW order after the incoming edge.
    // Neighbors are sorted by angle (CCW). The CW-next is the previous in the array.
    const prevIdx = neighbors.indexOf(prevEntry);

    // Next in clockwise order = previous in the sorted-by-angle array (angles sorted CCW)
    const nextIdx = (prevIdx - 1 + neighbors.length) % neighbors.length;
    const nextEntry = neighbors[nextIdx]!;

    if (nextEntry.neighborId === prevId && neighbors.length === 1) return null; // Dead end

    prevId = currentId;
    currentId = nextEntry.neighborId;
  }

  return null; // Exceeded max steps
}

/**
 * Detect all faces in the planar graph.
 * Runs leftmost-turn from both directions of every edge.
 * Filters: exterior face (largest area) and degenerate faces (< 1mm²).
 */
export function detectAllFaces(state: ConstructionState): string[][] {
  const graph = buildAdjacencyGraph(state);
  const visitedEdges = new Set<string>();
  const faces: string[][] = [];

  for (const seg of state.segments) {
    // Try both directions
    for (const [fromId, toId] of [
      [seg.startPointId, seg.endPointId],
      [seg.endPointId, seg.startPointId],
    ]) {
      const edgeKey = `${fromId}->${toId}`;
      if (visitedEdges.has(edgeKey)) continue;

      const face = leftmostTurn(graph, fromId!, toId!);
      if (!face || face.length < 3) continue;

      // Check for simple cycle (no repeated points)
      if (new Set(face).size !== face.length) continue;

      // Mark all directed edges as visited
      for (let i = 0; i < face.length; i++) {
        const a = face[i]!;
        const b = face[(i + 1) % face.length]!;
        visitedEdges.add(`${a}->${b}`);
      }

      faces.push(face);
    }
  }

  if (faces.length === 0) return [];

  // Filter exterior face and degenerate faces.
  // Exterior face: largest absolute area. Tiebreaker: CW winding (negative signed area).
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  let maxScore = -Infinity;
  let maxIdx = -1;

  for (let i = 0; i < faces.length; i++) {
    const signed = shoelaceArea(faces[i]!, pointMap);
    const absArea = Math.abs(signed);
    // Primary: largest absolute area. Tiebreaker: negative signed (CW = exterior)
    const score = absArea * 1000 + (signed < 0 ? 1 : 0);
    if (score > maxScore) {
      maxScore = score;
      maxIdx = i;
    }
  }

  // Filter exterior face and degenerate, then deduplicate same-vertex-set faces
  const seen = new Set<string>();
  return faces.filter((face, i) => {
    if (i === maxIdx) return false; // exterior face
    const area = Math.abs(shoelaceArea(face, pointMap));
    if (area < 1) return false; // degenerate (< 1mm²)
    const key = [...face].sort().join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Classification ───────────────────────────────────────

/**
 * Classify detected faces into named figures.
 */
export function classifyFigures(
  faces: string[][],
  state: ConstructionState,
  displayMode: DisplayMode,
): Figure[] {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));

  return faces.map((face, idx) => {
    const sides = computeSides(face, pointMap);
    const angles = computeInteriorAngles(face, pointMap);
    const selfIntersecting = isSelfIntersecting(face, pointMap);

    // Find segment IDs for this face
    const segmentIds = findSegmentIds(face, state);

    // Classify
    const vertexLabels = face.map((id) => pointMap.get(id)?.label ?? '?').join('');
    let name: string;
    if (face.length === 3) {
      name = `${classifyTriangle(sides, angles, displayMode)} ${vertexLabels}`;
    } else if (face.length === 4) {
      const facePoints = face.map((id) => pointMap.get(id)!).filter(Boolean);
      name = `${classifyQuadrilateral(sides, angles, facePoints)} ${vertexLabels}`;
    } else {
      name = `Polygone ${vertexLabels} à ${face.length} côtés`;
    }

    // Compute height for triangles and parallelograms (complet mode only)
    let height: FigureHeight | undefined;
    if (displayMode === 'complet' && !selfIntersecting) {
      if (face.length === 3) {
        height = computeTriangleHeight(face, pointMap);
      } else if (
        face.length === 4 &&
        ['Parallélogramme', 'Rectangle', 'Carré', 'Losange'].some((n) => name.startsWith(n))
      ) {
        height = computeParallelogramHeight(face, pointMap);
      }
    }

    return {
      id: `figure-${idx}`,
      pointIds: face,
      segmentIds,
      name,
      selfIntersecting,
      height,
    };
  });
}

/** Classify a triangle. 3e cycle: cumulative. 2e cycle: most specific. */
export function classifyTriangle(
  sides: number[],
  angles: number[],
  displayMode: DisplayMode,
): string {
  const sortedSides = [...sides].sort((a, b) => a - b);
  const hasRightAngle = angles.some((a) => a >= 89.5 && a <= 90.5);
  const equalPairs = countEqualPairs(sortedSides);
  const isEquilateral = equalPairs === 3;
  const isIsosceles = equalPairs >= 1;

  if (displayMode === 'complet') {
    // Cumulative classification
    const parts: string[] = [];
    if (isEquilateral) {
      parts.push('équilatéral');
    } else {
      if (hasRightAngle) parts.push('rectangle');
      if (isIsosceles) parts.push('isocèle');
      if (!isIsosceles) parts.push('scalène');
    }
    return `Triangle ${parts.join(' ')}`;
  }

  // Simplifié: most specific, priority equilatéral > rectangle > isocèle > scalène
  if (isEquilateral) return 'Triangle équilatéral';
  if (hasRightAngle) return 'Triangle rectangle';
  if (isIsosceles) return 'Triangle isocèle';
  return 'Triangle scalène';
}

/** Classify a quadrilateral by most specific name. Uses real directions for parallelism. */
export function classifyQuadrilateral(
  sides: number[],
  angles: number[],
  facePoints: Point[],
): string {
  const allRightAngles = angles.every((a) => a >= 89.5 && a <= 90.5);
  const allEqualSides = countEqualPairs(sides) >= 6;
  const parallelPairs = countParallelOppositeSides(facePoints);

  if (allRightAngles && allEqualSides) return 'Carré';
  if (allRightAngles) return 'Rectangle';
  if (allEqualSides && parallelPairs >= 2) return 'Losange';
  if (parallelPairs >= 2) return 'Parallélogramme';
  if (parallelPairs >= 1) return 'Trapèze';
  return 'Quadrilatère';
}

// ── Helpers ──────────────────────────────────────────────

function shoelaceArea(face: string[], pointMap: Map<string, Point>): number {
  let area = 0;
  const n = face.length;
  for (let i = 0; i < n; i++) {
    const p1 = pointMap.get(face[i]!);
    const p2 = pointMap.get(face[(i + 1) % n]!);
    if (!p1 || !p2) return 0;
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return area / 2;
}

function computeSides(face: string[], pointMap: Map<string, Point>): number[] {
  const sides: number[] = [];
  for (let i = 0; i < face.length; i++) {
    const p1 = pointMap.get(face[i]!);
    const p2 = pointMap.get(face[(i + 1) % face.length]!);
    if (p1 && p2) sides.push(distance(p1, p2));
  }
  return sides;
}

/**
 * Compute interior angles of a polygon face.
 * First computes unsigned angles, then checks if any are reflex (> 180°)
 * by comparing the angle sum against the expected (n-2)×180°.
 */
function computeInteriorAngles(face: string[], pointMap: Map<string, Point>): number[] {
  const n = face.length;
  const unsignedAngles: number[] = [];
  const crossSigns: number[] = [];

  // Determine winding via signed area
  const signedArea = shoelaceArea(face, pointMap);

  for (let i = 0; i < n; i++) {
    const prev = pointMap.get(face[(i - 1 + n) % n]!);
    const curr = pointMap.get(face[i]!);
    const next = pointMap.get(face[(i + 1) % n]!);
    if (!prev || !curr || !next) {
      unsignedAngles.push(0);
      crossSigns.push(0);
      continue;
    }

    const dx1 = prev.x - curr.x;
    const dy1 = prev.y - curr.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const dot = dx1 * dx2 + dy1 * dy2;
    const cross = dx1 * dy2 - dy1 * dx2;
    unsignedAngles.push(Math.atan2(Math.abs(cross), dot) * (180 / Math.PI));
    crossSigns.push(cross);
  }

  // Determine winding convention.
  // In y-down screen coords: positive signedArea = CW visual (clockwise on screen).
  // For a CW-wound polygon on screen, at a convex vertex the cross product is negative.
  // A vertex is reflex when cross product sign is OPPOSITE to what's expected for the winding.
  const expectNegativeCross = signedArea > 0; // CW visual → expect negative cross at convex vertices

  return unsignedAngles.map((angle, i) => {
    const cross = crossSigns[i]!;
    const isReflex = expectNegativeCross ? cross > 0 : cross < 0;
    return isReflex ? 360 - angle : angle;
  });
}

function countEqualPairs(sides: number[]): number {
  let count = 0;
  for (let i = 0; i < sides.length; i++) {
    for (let j = i + 1; j < sides.length; j++) {
      if (Math.abs(sides[i]! - sides[j]!) <= 1) count++;
    }
  }
  return count;
}

/** Count parallel opposite side pairs using actual directions (not length proxy). */
function countParallelOppositeSides(facePoints: Point[]): number {
  if (facePoints.length !== 4) return 0;

  const PARALLEL_TOL = 0.5; // degrees
  let pairs = 0;

  // Side 0-1 vs side 2-3 (opposite sides in a quadrilateral)
  const dir01 = normalizedDir(facePoints[0]!, facePoints[1]!);
  const dir23 = normalizedDir(facePoints[2]!, facePoints[3]!);
  if (dirDiff(dir01, dir23) < PARALLEL_TOL) pairs++;

  // Side 1-2 vs side 3-0
  const dir12 = normalizedDir(facePoints[1]!, facePoints[2]!);
  const dir30 = normalizedDir(facePoints[3]!, facePoints[0]!);
  if (dirDiff(dir12, dir30) < PARALLEL_TOL) pairs++;

  return pairs;
}

function normalizedDir(p1: Point, p2: Point): number {
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  const norm = ((angle % 360) + 360) % 360;
  return norm >= 180 ? norm - 180 : norm;
}

function dirDiff(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > 90) diff = 180 - diff;
  return diff;
}

function isSelfIntersecting(face: string[], pointMap: Map<string, Point>): boolean {
  const n = face.length;
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  for (let i = 0; i < n; i++) {
    const p1 = pointMap.get(face[i]!);
    const p2 = pointMap.get(face[(i + 1) % n]!);
    if (p1 && p2) edges.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
  }

  // Check all non-adjacent edge pairs
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 2; j < edges.length; j++) {
      if (i === 0 && j === edges.length - 1) continue; // Adjacent (wrap)
      if (segmentsIntersect(edges[i]!, edges[j]!)) return true;
    }
  }

  return false;
}

function segmentsIntersect(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
): boolean {
  const d1 = cross(b, a.x1, a.y1);
  const d2 = cross(b, a.x2, a.y2);
  const d3 = cross(a, b.x1, b.y1);
  const d4 = cross(a, b.x2, b.y2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function cross(
  seg: { x1: number; y1: number; x2: number; y2: number },
  px: number,
  py: number,
): number {
  return (seg.x2 - seg.x1) * (py - seg.y1) - (seg.y2 - seg.y1) * (px - seg.x1);
}

function findSegmentIds(face: string[], state: ConstructionState): string[] {
  const ids: string[] = [];
  for (let i = 0; i < face.length; i++) {
    const a = face[i]!;
    const b = face[(i + 1) % face.length]!;
    const seg = state.segments.find(
      (s) =>
        (s.startPointId === a && s.endPointId === b) ||
        (s.startPointId === b && s.endPointId === a),
    );
    if (seg) ids.push(seg.id);
  }
  return ids;
}

/**
 * Compute the height of a triangle from the longest base.
 * Projects the opposite vertex onto the base line.
 */
function computeTriangleHeight(
  face: string[],
  pointMap: Map<string, Point>,
): FigureHeight | undefined {
  if (face.length !== 3) return undefined;
  const pts = face.map((id) => pointMap.get(id)).filter(Boolean) as Point[];
  if (pts.length !== 3) return undefined;

  // Find the longest side as base
  const sides = [
    { base: [0, 1] as const, vertex: 2, len: distance(pts[0]!, pts[1]!) },
    { base: [1, 2] as const, vertex: 0, len: distance(pts[1]!, pts[2]!) },
    { base: [2, 0] as const, vertex: 1, len: distance(pts[2]!, pts[0]!) },
  ];
  sides.sort((a, b) => b.len - a.len);
  const best = sides[0]!;

  const baseP1 = pts[best.base[0]]!;
  const baseP2 = pts[best.base[1]]!;
  const vertex = pts[best.vertex]!;

  const foot = projectPointOnLine(vertex, baseP1, baseP2);
  const heightMm = distance(vertex, foot);

  return {
    baseLengthMm: best.len,
    heightMm,
    baseLabel: `${baseP1.label}${baseP2.label}`,
    vertexLabel: vertex.label,
    footMm: foot,
    vertexMm: { x: vertex.x, y: vertex.y },
    isTriangle: true,
  };
}

/**
 * Compute the height of a parallelogram from the longest base.
 */
function computeParallelogramHeight(
  face: string[],
  pointMap: Map<string, Point>,
): FigureHeight | undefined {
  if (face.length !== 4) return undefined;
  const pts = face.map((id) => pointMap.get(id)).filter(Boolean) as Point[];
  if (pts.length !== 4) return undefined;

  // Use side 0-1 as base, vertex 3 as opposite
  const baseP1 = pts[0]!;
  const baseP2 = pts[1]!;
  const vertex = pts[3]!; // Opposite vertex in a parallelogram

  const baseLengthMm = distance(baseP1, baseP2);
  const foot = projectPointOnLine(vertex, baseP1, baseP2);
  const heightMm = distance(vertex, foot);

  return {
    baseLengthMm,
    heightMm,
    baseLabel: `${baseP1.label}${baseP2.label}`,
    vertexLabel: vertex.label,
    footMm: foot,
    vertexMm: { x: vertex.x, y: vertex.y },
    isTriangle: false,
  };
}

/** Project a point onto the infinite line through p1 and p2. */
function projectPointOnLine(point: Point, p1: Point, p2: Point): { x: number; y: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: p1.x, y: p1.y };
  const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
  return { x: p1.x + t * dx, y: p1.y + t * dy };
}
