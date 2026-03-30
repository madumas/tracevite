import {
  buildAdjacencyGraph,
  detectAllFaces,
  classifyFigures,
  classifyTriangle,
  classifyQuadrilateral,
  shouldDisplayArea,
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
    const figures = classifyFigures(faces, state, '3e_cycle');
    expect(figures.length).toBeGreaterThanOrEqual(1);
    const square = figures.find((f) => f.name.includes('Carré'));
    expect(square).toBeDefined();
  });

  it('classifies a right triangle', () => {
    const state = buildTriangle();
    const faces = detectAllFaces(state);
    const figures = classifyFigures(faces, state, '2e_cycle');
    expect(figures.length).toBeGreaterThanOrEqual(1);
    const triangle = figures.find((f) => f.name.includes('Triangle'));
    expect(triangle).toBeDefined();
  });
});

describe('classifyTriangle', () => {
  it('equilatéral', () => {
    expect(classifyTriangle([50, 50, 50], [60, 60, 60], '2e_cycle')).toBe('Triangle équilatéral');
  });

  it('rectangle in 2e cycle', () => {
    expect(classifyTriangle([30, 40, 50], [90, 53.13, 36.87], '2e_cycle')).toBe(
      'Triangle rectangle',
    );
  });

  it('rectangle isocèle cumulative in 3e cycle', () => {
    const name = classifyTriangle([50, 50, 70.71], [90, 45, 45], '3e_cycle');
    expect(name).toContain('rectangle');
    expect(name).toContain('isocèle');
  });

  it('isocèle in 2e cycle', () => {
    expect(classifyTriangle([50, 50, 30], [70, 70, 40], '2e_cycle')).toBe('Triangle isocèle');
  });

  it('scalène in 2e cycle', () => {
    expect(classifyTriangle([30, 40, 55], [35, 48, 97], '2e_cycle')).toBe('Triangle scalène');
  });
});

describe('classifyQuadrilateral', () => {
  it('carré', () => {
    expect(classifyQuadrilateral([40, 40, 40, 40], [90, 90, 90, 90], '2e_cycle')).toBe('Carré');
  });

  it('rectangle', () => {
    expect(classifyQuadrilateral([40, 60, 40, 60], [90, 90, 90, 90], '2e_cycle')).toBe('Rectangle');
  });

  it('losange', () => {
    expect(classifyQuadrilateral([50, 50, 50, 50], [60, 120, 60, 120], '2e_cycle')).toBe('Losange');
  });
});

describe('shouldDisplayArea', () => {
  it('displays area for rectangle in 2e cycle', () => {
    expect(shouldDisplayArea('Rectangle', '2e_cycle')).toBe(true);
  });

  it('does not display area for triangle in 2e cycle', () => {
    expect(shouldDisplayArea('Triangle rectangle', '2e_cycle')).toBe(false);
  });

  it('displays area for triangle in 3e cycle', () => {
    expect(shouldDisplayArea('Triangle rectangle', '3e_cycle')).toBe(true);
  });

  it('does not display area for losange', () => {
    expect(shouldDisplayArea('Losange', '2e_cycle')).toBe(false);
    expect(shouldDisplayArea('Losange', '3e_cycle')).toBe(false);
  });
});
