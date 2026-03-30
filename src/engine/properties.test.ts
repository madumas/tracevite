import {
  detectParallelSegments,
  detectPerpendicularSegments,
  detectEqualLengths,
  detectAllProperties,
} from './properties';
import type { Point, Segment } from '@/model/types';

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
