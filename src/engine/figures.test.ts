import {
  buildAdjacencyGraph,
  detectAllFaces,
  classifyFigures,
  classifyTriangle,
  classifyQuadrilateral,
} from './figures';
import { createInitialState, addPoint, addSegment } from '@/model/state';

function buildSquare() {
  let state = createInitialState();
  const a = addPoint(state, 0, 0);
  state = a.state;
  const b = addPoint(state, 40, 0);
  state = b.state;
  const c = addPoint(state, 40, 40);
  state = c.state;
  const d = addPoint(state, 0, 40);
  state = d.state;

  state = addSegment(state, a.pointId, b.pointId)!.state;
  state = addSegment(state, b.pointId, c.pointId)!.state;
  state = addSegment(state, c.pointId, d.pointId)!.state;
  state = addSegment(state, d.pointId, a.pointId)!.state;

  return state;
}

function buildTriangle() {
  let state = createInitialState();
  const a = addPoint(state, 0, 0);
  state = a.state;
  const b = addPoint(state, 50, 0);
  state = b.state;
  const c = addPoint(state, 0, 50);
  state = c.state;

  state = addSegment(state, a.pointId, b.pointId)!.state;
  state = addSegment(state, b.pointId, c.pointId)!.state;
  state = addSegment(state, c.pointId, a.pointId)!.state;

  return state;
}

describe('buildAdjacencyGraph', () => {
  it('creates adjacency entries for all points', () => {
    const state = buildTriangle();
    const graph = buildAdjacencyGraph(state);
    expect(graph.size).toBe(3);

    // Each vertex should have 2 neighbors
    for (const [, neighbors] of graph) {
      expect(neighbors).toHaveLength(2);
    }
  });
});

describe('detectAllFaces', () => {
  it('detects a single triangle', () => {
    const state = buildTriangle();
    const faces = detectAllFaces(state);
    expect(faces.length).toBeGreaterThanOrEqual(1);
    // At least one face with 3 points
    expect(faces.some((f) => f.length === 3)).toBe(true);
  });

  it('detects a single square', () => {
    const state = buildSquare();
    const faces = detectAllFaces(state);
    expect(faces.length).toBeGreaterThanOrEqual(1);
    expect(faces.some((f) => f.length === 4)).toBe(true);
  });

  it('detects two triangles when diagonal added to square', () => {
    let state = buildSquare();
    // Add diagonal A-C
    const aId = state.points[0]!.id;
    const cId = state.points[2]!.id;
    state = addSegment(state, aId, cId)!.state;

    const faces = detectAllFaces(state);
    const triangles = faces.filter((f) => f.length === 3);
    expect(triangles.length).toBe(2);
  });

  it('returns empty for no closed figures', () => {
    let state = createInitialState();
    const a = addPoint(state, 0, 0);
    state = a.state;
    const b = addPoint(state, 50, 0);
    state = b.state;
    state = addSegment(state, a.pointId, b.pointId)!.state;

    const faces = detectAllFaces(state);
    expect(faces).toHaveLength(0);
  });
});

describe('classifyFigures', () => {
  it('classifies a square', () => {
    const state = buildSquare();
    const faces = detectAllFaces(state);
    const figures = classifyFigures(faces, state, 'complet');
    expect(figures.length).toBeGreaterThanOrEqual(1);
    const square = figures.find((f) => f.name.includes('Carré'));
    expect(square).toBeDefined();
  });

  it('classifies a right triangle', () => {
    const state = buildTriangle();
    const faces = detectAllFaces(state);
    const figures = classifyFigures(faces, state, 'simplifie');
    expect(figures.length).toBeGreaterThanOrEqual(1);
    const triangle = figures.find((f) => f.name.includes('Triangle'));
    expect(triangle).toBeDefined();
  });
});

describe('classifyTriangle', () => {
  it('equilatéral', () => {
    expect(classifyTriangle([50, 50, 50], [60, 60, 60], 'simplifie')).toBe('Triangle équilatéral');
  });

  it('rectangle in simplifie mode', () => {
    expect(classifyTriangle([30, 40, 50], [90, 53.13, 36.87], 'simplifie')).toBe(
      'Triangle rectangle',
    );
  });

  it('rectangle isocèle cumulative in complet mode', () => {
    const name = classifyTriangle([50, 50, 70.71], [90, 45, 45], 'complet');
    expect(name).toContain('rectangle');
    expect(name).toContain('isocèle');
  });

  it('isocèle in simplifie mode', () => {
    expect(classifyTriangle([50, 50, 30], [70, 70, 40], 'simplifie')).toBe('Triangle isocèle');
  });

  it('scalène in simplifie mode', () => {
    expect(classifyTriangle([30, 40, 55], [35, 48, 97], 'simplifie')).toBe('Triangle scalène');
  });
});

describe('classifyQuadrilateral', () => {
  const sq = [
    { id: '0', x: 0, y: 0, label: 'A', locked: false },
    { id: '1', x: 40, y: 0, label: 'B', locked: false },
    { id: '2', x: 40, y: 40, label: 'C', locked: false },
    { id: '3', x: 0, y: 40, label: 'D', locked: false },
  ];

  it('carré', () => {
    expect(classifyQuadrilateral([40, 40, 40, 40], [90, 90, 90, 90], sq)).toBe('Carré');
  });

  it('rectangle', () => {
    const rect = [
      { id: '0', x: 0, y: 0, label: 'A', locked: false },
      { id: '1', x: 60, y: 0, label: 'B', locked: false },
      { id: '2', x: 60, y: 40, label: 'C', locked: false },
      { id: '3', x: 0, y: 40, label: 'D', locked: false },
    ];
    expect(classifyQuadrilateral([60, 40, 60, 40], [90, 90, 90, 90], rect)).toBe('Rectangle');
  });

  it('losange', () => {
    // Rhombus: all sides equal, opposite sides parallel, but not right angles
    const rhombus = [
      { id: '0', x: 25, y: 0, label: 'A', locked: false },
      { id: '1', x: 50, y: 43.3, label: 'B', locked: false },
      { id: '2', x: 25, y: 86.6, label: 'C', locked: false },
      { id: '3', x: 0, y: 43.3, label: 'D', locked: false },
    ];
    expect(classifyQuadrilateral([50, 50, 50, 50], [60, 120, 60, 120], rhombus)).toBe('Losange');
  });

  it('parallélogramme', () => {
    const para = [
      { id: '0', x: 0, y: 0, label: 'A', locked: false },
      { id: '1', x: 60, y: 0, label: 'B', locked: false },
      { id: '2', x: 80, y: 40, label: 'C', locked: false },
      { id: '3', x: 20, y: 40, label: 'D', locked: false },
    ];
    expect(classifyQuadrilateral([60, 44.7, 60, 44.7], [63.4, 116.6, 63.4, 116.6], para)).toBe(
      'Parallélogramme',
    );
  });

  it('trapèze (one pair of parallel sides)', () => {
    const trap = [
      { id: '0', x: 10, y: 0, label: 'A', locked: false },
      { id: '1', x: 90, y: 0, label: 'B', locked: false },
      { id: '2', x: 70, y: 50, label: 'C', locked: false },
      { id: '3', x: 30, y: 50, label: 'D', locked: false },
    ];
    // Top and bottom are parallel (both horizontal), sides are not
    const sides = [80, 28.28, 40, 28.28];
    const angles = [68.2, 111.8, 111.8, 68.2];
    expect(classifyQuadrilateral(sides, angles, trap)).toBe('Trapèze');
  });

  it('quadrilatère général (no parallel sides)', () => {
    const gen = [
      { id: '0', x: 0, y: 0, label: 'A', locked: false },
      { id: '1', x: 50, y: 5, label: 'B', locked: false },
      { id: '2', x: 80, y: 60, label: 'C', locked: false },
      { id: '3', x: 10, y: 40, label: 'D', locked: false },
    ];
    expect(classifyQuadrilateral([50.2, 63.6, 73.8, 40.3], [95, 70, 100, 95], gen)).toBe(
      'Quadrilatère',
    );
  });
});

describe('self-intersecting detection', () => {
  // Note: A true bowtie (crossing edges) has zero shoelace area and gets
  // filtered by detectAllFaces (< 1mm²). The selfIntersecting flag only
  // applies to faces that survive the area filter.

  it('normal quadrilateral is not self-intersecting', () => {
    const state = buildSquare();
    const faces = detectAllFaces(state);
    const figures = classifyFigures(faces, state, 'complet');
    const quad = figures.find((f) => f.pointIds.length === 4);
    expect(quad).toBeDefined();
    expect(quad!.selfIntersecting).toBe(false);
  });

  it('bowtie quadrilateral is filtered out by area check', () => {
    let state = createInitialState();
    const a = addPoint(state, 0, 0);
    state = a.state;
    const b = addPoint(state, 40, 40);
    state = b.state;
    const c = addPoint(state, 40, 0);
    state = c.state;
    const d = addPoint(state, 0, 40);
    state = d.state;

    state = addSegment(state, a.pointId, b.pointId)!.state;
    state = addSegment(state, b.pointId, c.pointId)!.state;
    state = addSegment(state, c.pointId, d.pointId)!.state;
    state = addSegment(state, d.pointId, a.pointId)!.state;

    const faces = detectAllFaces(state);
    // Bowtie has ~0 area → no faces detected
    expect(faces).toHaveLength(0);
  });
});

describe('degenerate face filtering', () => {
  it('filters out near-collinear triangle (area < 1mm²)', () => {
    // Three nearly collinear points: area ≈ 0.5mm²
    let state = createInitialState();
    const a = addPoint(state, 0, 0);
    state = a.state;
    const b = addPoint(state, 100, 0);
    state = b.state;
    const c = addPoint(state, 50, 0.01); // Nearly on the line
    state = c.state;

    state = addSegment(state, a.pointId, b.pointId)!.state;
    state = addSegment(state, b.pointId, c.pointId)!.state;
    state = addSegment(state, c.pointId, a.pointId)!.state;

    const faces = detectAllFaces(state);
    expect(faces).toHaveLength(0);
  });
});

describe('polygon classification', () => {
  it('classifies pentagon as polygone à 5 côtés', () => {
    let state = createInitialState();
    // Regular pentagon (approximate)
    const coords = [
      { x: 50, y: 0 },
      { x: 97.6, y: 34.5 },
      { x: 79.4, y: 90.5 },
      { x: 20.6, y: 90.5 },
      { x: 2.4, y: 34.5 },
    ];
    const pointIds: string[] = [];
    for (const c of coords) {
      const result = addPoint(state, c.x, c.y);
      state = result.state;
      pointIds.push(result.pointId);
    }
    for (let i = 0; i < 5; i++) {
      state = addSegment(state, pointIds[i]!, pointIds[(i + 1) % 5]!)!.state;
    }

    const faces = detectAllFaces(state);
    const figures = classifyFigures(faces, state, 'complet');
    const pentagon = figures.find((f) => f.name.includes('5 côtés'));
    expect(pentagon).toBeDefined();
  });
});

describe('cumulative triangle classification', () => {
  it('rectangle isocèle in complet mode shows both qualifiers', () => {
    const name = classifyTriangle([50, 50, 70.71], [90, 45, 45], 'complet');
    expect(name).toContain('rectangle');
    expect(name).toContain('isocèle');
  });

  it('rectangle isocèle in simplifie mode shows only most specific', () => {
    const name = classifyTriangle([50, 50, 70.71], [90, 45, 45], 'simplifie');
    expect(name).toBe('Triangle rectangle');
  });

  it('equilateral is not cumulative (single label)', () => {
    const name = classifyTriangle([50, 50, 50], [60, 60, 60], 'complet');
    expect(name).toBe('Triangle équilatéral');
    expect(name).not.toContain('isocèle');
  });

  it('scalène in both modes', () => {
    expect(classifyTriangle([30, 40, 55], [35, 48, 97], 'complet')).toBe('Triangle scalène');
    expect(classifyTriangle([30, 40, 55], [35, 48, 97], 'simplifie')).toBe('Triangle scalène');
  });
});

describe('triangle height (complet mode)', () => {
  it('computes height for right triangle', () => {
    let state = createInitialState();
    const a = addPoint(state, 0, 0);
    state = a.state;
    const b = addPoint(state, 40, 0);
    state = b.state;
    const c = addPoint(state, 0, 30);
    state = c.state;

    state = addSegment(state, a.pointId, b.pointId)!.state;
    state = addSegment(state, b.pointId, c.pointId)!.state;
    state = addSegment(state, c.pointId, a.pointId)!.state;

    const faces = detectAllFaces(state);
    const figures = classifyFigures(faces, state, 'complet');
    const triangle = figures.find((f) => f.name.includes('Triangle'));
    expect(triangle).toBeDefined();
    expect(triangle!.height).toBeDefined();
    expect(triangle!.height!.heightMm).toBeGreaterThan(0);
    expect(triangle!.height!.isTriangle).toBe(true);
  });

  it('does not compute height in simplifie mode', () => {
    let state = createInitialState();
    const a = addPoint(state, 0, 0);
    state = a.state;
    const b = addPoint(state, 40, 0);
    state = b.state;
    const c = addPoint(state, 0, 30);
    state = c.state;

    state = addSegment(state, a.pointId, b.pointId)!.state;
    state = addSegment(state, b.pointId, c.pointId)!.state;
    state = addSegment(state, c.pointId, a.pointId)!.state;

    const faces = detectAllFaces(state);
    const figures = classifyFigures(faces, state, 'simplifie');
    const triangle = figures.find((f) => f.name.includes('Triangle'));
    expect(triangle).toBeDefined();
    expect(triangle!.height).toBeUndefined();
  });
});
