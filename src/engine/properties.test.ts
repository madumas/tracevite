import {
  detectParallelSegments,
  detectPerpendicularSegments,
  detectEqualLengths,
  detectAllProperties,
  groupParallelProperties,
  detectSymmetryAxes,
} from './properties';
import type { DetectedProperty, Point, Segment, Circle } from '@/model/types';
import type { Figure } from './figures';
import { createInitialState, addPoint, addSegment } from '@/model/state';

function makePoints(...coords: Array<[number, number]>): Point[] {
  return coords.map(([x, y], i) => ({
    id: `p${i}`,
    x,
    y,
    label: String.fromCharCode(65 + i),
    locked: false,
  }));
}

function makeSeg(id: string, startIdx: number, endIdx: number, points: Point[]): Segment {
  const start = points[startIdx]!;
  const end = points[endIdx]!;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    id,
    startPointId: start.id,
    endPointId: end.id,
    lengthMm: Math.sqrt(dx * dx + dy * dy),
  };
}

describe('detectParallelSegments', () => {
  it('detects two horizontal parallel segments', () => {
    const points = makePoints([0, 0], [100, 0], [0, 50], [100, 50]);
    const segments = [makeSeg('s1', 0, 1, points), makeSeg('s2', 2, 3, points)];

    const result = detectParallelSegments(segments, points);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('parallel');
    expect(result[0]!.label).toContain('//');
  });

  it('detects parallel segments at an angle', () => {
    const points = makePoints([0, 0], [50, 50], [10, 0], [60, 50]);
    const segments = [makeSeg('s1', 0, 1, points), makeSeg('s2', 2, 3, points)];

    const result = detectParallelSegments(segments, points);
    expect(result).toHaveLength(1);
  });

  it('rejects non-parallel segments', () => {
    const points = makePoints([0, 0], [100, 0], [0, 50], [100, 60]);
    const segments = [makeSeg('s1', 0, 1, points), makeSeg('s2', 2, 3, points)];

    const result = detectParallelSegments(segments, points);
    expect(result).toHaveLength(0);
  });

  it('skips segments sharing an endpoint', () => {
    const points = makePoints([0, 0], [100, 0], [100, 100]);
    const segments = [makeSeg('s1', 0, 1, points), makeSeg('s2', 1, 2, points)];

    const result = detectParallelSegments(segments, points);
    expect(result).toHaveLength(0);
  });
});

describe('detectPerpendicularSegments', () => {
  it('detects perpendicular segments', () => {
    const points = makePoints([0, 0], [100, 0], [50, -50], [50, 50]);
    const segments = [makeSeg('s1', 0, 1, points), makeSeg('s2', 2, 3, points)];

    const result = detectPerpendicularSegments(segments, points);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('perpendicular');
  });

  it('rejects near-perpendicular outside tolerance', () => {
    // 88° angle between directions (outside 89.5-90.5)
    const angle = (88 * Math.PI) / 180;
    const points = makePoints(
      [0, 0],
      [100, 0],
      [50, -50],
      [50 + Math.cos(angle) * 50, -50 + Math.sin(angle) * 50],
    );
    const segments = [makeSeg('s1', 0, 1, points), makeSeg('s2', 2, 3, points)];

    // This might or might not pass depending on exact angle — the key is extreme cases
    const result = detectPerpendicularSegments(segments, points);
    // At 88° the diff is 88°, outside [89.5, 90.5] → no detection
    expect(result).toHaveLength(0);
  });
});

describe('detectEqualLengths', () => {
  it('detects segments with same length', () => {
    const points = makePoints([0, 0], [50, 0], [100, 0], [150, 0.5]);
    const segments: Segment[] = [
      { id: 's1', startPointId: 'p0', endPointId: 'p1', lengthMm: 50 },
      { id: 's2', startPointId: 'p2', endPointId: 'p3', lengthMm: 50.5 },
    ];

    const result = detectEqualLengths(segments, points);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('equal_length');
    expect(result[0]!.label).toBe('AB = CD');
  });

  it('rejects segments with different lengths', () => {
    const points = makePoints([0, 0], [50, 0], [100, 0], [152, 0]);
    const segments: Segment[] = [
      { id: 's1', startPointId: 'p0', endPointId: 'p1', lengthMm: 50 },
      { id: 's2', startPointId: 'p2', endPointId: 'p3', lengthMm: 52 },
    ];

    const result = detectEqualLengths(segments, points);
    expect(result).toHaveLength(0);
  });
});

describe('detectAllProperties', () => {
  it('detects parallel + equal length for a rectangle', () => {
    // Rectangle: AB horizontal 100mm, BC vertical 50mm, CD horizontal 100mm, DA vertical 50mm
    const points = makePoints([0, 0], [100, 0], [100, 50], [0, 50]);
    const segments = [
      makeSeg('s1', 0, 1, points), // AB horizontal
      makeSeg('s2', 1, 2, points), // BC vertical
      makeSeg('s3', 2, 3, points), // CD horizontal
      makeSeg('s4', 3, 0, points), // DA vertical
    ];

    const result = detectAllProperties(segments, points);
    const parallel = result.filter((p) => p.type === 'parallel');
    const equal = result.filter((p) => p.type === 'equal_length');

    expect(parallel.length).toBeGreaterThanOrEqual(1); // AB // CD
    expect(equal.length).toBeGreaterThanOrEqual(1); // AB = CD or BC = DA
  });
});

describe('groupParallelProperties', () => {
  // Shared test fixtures: 8 points (A-H) and 4 segments
  const gPoints: Point[] = [
    { id: 'p1', label: 'A', x: 0, y: 0, locked: false },
    { id: 'p2', label: 'B', x: 100, y: 0, locked: false },
    { id: 'p3', label: 'C', x: 0, y: 50, locked: false },
    { id: 'p4', label: 'D', x: 100, y: 50, locked: false },
    { id: 'p5', label: 'E', x: 0, y: 100, locked: false },
    { id: 'p6', label: 'F', x: 100, y: 100, locked: false },
    { id: 'p7', label: 'G', x: 0, y: 150, locked: false },
    { id: 'p8', label: 'H', x: 100, y: 150, locked: false },
  ];
  const gSegments: Segment[] = [
    { id: 's1', startPointId: 'p1', endPointId: 'p2', lengthMm: 100 }, // AB
    { id: 's2', startPointId: 'p3', endPointId: 'p4', lengthMm: 100 }, // CD
    { id: 's3', startPointId: 'p5', endPointId: 'p6', lengthMm: 100 }, // EF
    { id: 's4', startPointId: 'p7', endPointId: 'p8', lengthMm: 100 }, // GH
  ];

  function par(ids: string[], label: string): DetectedProperty {
    return { type: 'parallel', involvedIds: ids, label };
  }

  it('returns input unchanged when no parallel properties exist', () => {
    const props: DetectedProperty[] = [
      { type: 'perpendicular', involvedIds: ['s1', 's2'], label: 'AB ⊥ CD' },
      { type: 'equal_length', involvedIds: ['s1', 's3'], label: 'AB = EF' },
    ];
    const result = groupParallelProperties(props, gSegments, gPoints);
    expect(result).toEqual(props);
  });

  it('returns input unchanged when only one parallel property exists', () => {
    const props: DetectedProperty[] = [par(['s1', 's2'], 'AB // CD')];
    const result = groupParallelProperties(props, gSegments, gPoints);
    expect(result).toEqual(props);
  });

  it('groups two parallel pairs sharing a segment into one group (A//B + B//C)', () => {
    const props: DetectedProperty[] = [
      par(['s1', 's2'], 'AB // CD'),
      par(['s2', 's3'], 'CD // EF'),
    ];
    const result = groupParallelProperties(props, gSegments, gPoints);
    const parallel = result.filter((p) => p.type === 'parallel');
    expect(parallel).toHaveLength(1);
    expect([...parallel[0]!.involvedIds].sort()).toEqual(['s1', 's2', 's3']);
    expect(parallel[0]!.label).toBe('AB // CD // EF');
  });

  it('keeps separate groups for unrelated parallel pairs', () => {
    const props: DetectedProperty[] = [
      par(['s1', 's2'], 'AB // CD'),
      par(['s3', 's4'], 'EF // GH'),
    ];
    const result = groupParallelProperties(props, gSegments, gPoints);
    const parallel = result.filter((p) => p.type === 'parallel');
    expect(parallel).toHaveLength(2);
    const allIds = parallel.map((p) => [...p.involvedIds].sort());
    expect(allIds).toContainEqual(['s1', 's2']);
    expect(allIds).toContainEqual(['s3', 's4']);
  });

  it('passes non-parallel properties through unchanged', () => {
    const perp: DetectedProperty = {
      type: 'perpendicular',
      involvedIds: ['s1', 's3'],
      label: 'AB ⊥ EF',
    };
    const eqLen: DetectedProperty = {
      type: 'equal_length',
      involvedIds: ['s1', 's2'],
      label: 'AB = CD',
    };
    const props: DetectedProperty[] = [
      par(['s1', 's2'], 'AB // CD'),
      par(['s2', 's3'], 'CD // EF'),
      perp,
      eqLen,
    ];
    const result = groupParallelProperties(props, gSegments, gPoints);
    const nonParallel = result.filter((p) => p.type !== 'parallel');
    expect(nonParallel).toEqual([perp, eqLen]);
  });
});

describe('detectAllProperties with chords', () => {
  it('detects a chord when segment endpoints lie on circle circumference', () => {
    // Circle centered at (50, 50) with radius 30
    const points = makePoints([50, 50], [80, 50], [20, 50]);
    // Point 0 = center, Point 1 and 2 are on circumference
    const circles: Circle[] = [{ id: 'c1', centerPointId: 'p0', radiusMm: 30 }];
    // Segment from point 1 to point 2 (both on circumference, neither is center)
    const segments = [makeSeg('s1', 1, 2, points)];

    const result = detectAllProperties(segments, points, circles);
    const chords = result.filter((p) => p.type === 'chord');
    expect(chords).toHaveLength(1);
    expect(chords[0]!.label).toContain('corde');
    expect(chords[0]!.label).toContain('A'); // center label
  });

  it('does not detect chord when one endpoint is the center', () => {
    const points = makePoints([50, 50], [80, 50]);
    const circles: Circle[] = [{ id: 'c1', centerPointId: 'p0', radiusMm: 30 }];
    // Segment from center to circumference — NOT a chord
    const segments = [makeSeg('s1', 0, 1, points)];

    const result = detectAllProperties(segments, points, circles);
    const chords = result.filter((p) => p.type === 'chord');
    expect(chords).toHaveLength(0);
  });

  it('does not detect chord when only one endpoint is on circumference', () => {
    const points = makePoints([50, 50], [80, 50], [90, 50]);
    const circles: Circle[] = [{ id: 'c1', centerPointId: 'p0', radiusMm: 30 }];
    // Point 1 is on circumference (dist=30), point 2 is NOT (dist=40)
    const segments = [makeSeg('s1', 1, 2, points)];

    const result = detectAllProperties(segments, points, circles);
    const chords = result.filter((p) => p.type === 'chord');
    expect(chords).toHaveLength(0);
  });
});

describe('detectSymmetryAxes', () => {
  it('detects symmetry axis of a square', () => {
    // Build a square ABCD and a diagonal segment
    let state = createInitialState();
    const pA = addPoint(state, 0, 0);
    state = pA.state;
    const pB = addPoint(state, 50, 0);
    state = pB.state;
    const pC = addPoint(state, 50, 50);
    state = pC.state;
    const pD = addPoint(state, 0, 50);
    state = pD.state;
    state = addSegment(state, pA.pointId, pB.pointId)!.state;
    state = addSegment(state, pB.pointId, pC.pointId)!.state;
    state = addSegment(state, pC.pointId, pD.pointId)!.state;
    state = addSegment(state, pD.pointId, pA.pointId)!.state;
    // Diagonal AC
    state = addSegment(state, pA.pointId, pC.pointId)!.state;

    const figures: Figure[] = [
      {
        id: 'figure-0',
        pointIds: [pA.pointId, pB.pointId, pC.pointId, pD.pointId],
        segmentIds: state.segments.slice(0, 4).map((s) => s.id),
        name: 'Carré ABCD',
        selfIntersecting: false,
        convex: true,
      },
    ];

    const result = detectSymmetryAxes(state.segments, state.points, figures, state);
    const axisProps = result.filter((p) => p.type === 'symmetry_axis');
    // The diagonal AC should be detected as a symmetry axis
    expect(axisProps.length).toBeGreaterThanOrEqual(1);
    expect(axisProps.some((p) => p.label.includes('carré ABCD'))).toBe(true);
  });

  it('does not detect axis for scalene triangle', () => {
    let state = createInitialState();
    const pA = addPoint(state, 0, 0);
    state = pA.state;
    const pB = addPoint(state, 70, 0);
    state = pB.state;
    const pC = addPoint(state, 20, 40);
    state = pC.state;
    state = addSegment(state, pA.pointId, pB.pointId)!.state;
    state = addSegment(state, pB.pointId, pC.pointId)!.state;
    state = addSegment(state, pC.pointId, pA.pointId)!.state;
    // Add an arbitrary segment through the triangle
    const pD = addPoint(state, 35, -10);
    state = pD.state;
    const pE = addPoint(state, 35, 50);
    state = pE.state;
    state = addSegment(state, pD.pointId, pE.pointId)!.state;

    const figures: Figure[] = [
      {
        id: 'figure-0',
        pointIds: [pA.pointId, pB.pointId, pC.pointId],
        segmentIds: state.segments.slice(0, 3).map((s) => s.id),
        name: 'Triangle scalène ABC',
        selfIntersecting: false,
        convex: true,
      },
    ];

    const result = detectSymmetryAxes(state.segments, state.points, figures, state);
    expect(result).toHaveLength(0);
  });
});
