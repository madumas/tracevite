import { compareFiguresByTranslation } from './comparison';
import type { Point } from '@/model/types';

function makePoint(id: string, x: number, y: number): Point {
  return { id, x, y, label: id, locked: false };
}

describe('compareFiguresByTranslation', () => {
  it('returns isometric for identical triangles at different positions', () => {
    const points: Point[] = [
      // Triangle A at origin
      makePoint('a1', 0, 0),
      makePoint('a2', 30, 0),
      makePoint('a3', 15, 20),
      // Triangle B translated by (50, 10)
      makePoint('b1', 50, 10),
      makePoint('b2', 80, 10),
      makePoint('b3', 65, 30),
    ];
    const result = compareFiguresByTranslation(['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], points);
    expect(result.isIsometric).toBe(true);
    expect(result.maxDeviationMm).toBeCloseTo(0, 1);
    expect(result.correspondences).toHaveLength(3);
    expect(result.translationVector.x).toBeCloseTo(50, 1);
    expect(result.translationVector.y).toBeCloseTo(10, 1);
  });

  it('handles cyclic vertex offset (different starting vertex)', () => {
    // Triangle A: (0,0), (40,0), (40,30)
    // Triangle B: same shape + (100,0), but starting from what was vertex 3
    const points: Point[] = [
      makePoint('a1', 0, 0),
      makePoint('a2', 40, 0),
      makePoint('a3', 40, 30),
      makePoint('b1', 140, 30), // corresponds to a3
      makePoint('b2', 100, 0), // corresponds to a1
      makePoint('b3', 140, 0), // corresponds to a2
    ];
    const result = compareFiguresByTranslation(['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], points);
    expect(result.isIsometric).toBe(true);
    expect(result.maxDeviationMm).toBeCloseTo(0, 1);
  });

  it('handles reversed winding order', () => {
    const points: Point[] = [
      makePoint('a1', 0, 0),
      makePoint('a2', 30, 0),
      makePoint('a3', 15, 20),
      // Same triangle but wound clockwise instead of counter-clockwise
      makePoint('b1', 65, 30),
      makePoint('b2', 80, 10),
      makePoint('b3', 50, 10),
    ];
    const result = compareFiguresByTranslation(['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], points);
    expect(result.isIsometric).toBe(true);
    expect(result.maxDeviationMm).toBeCloseTo(0, 1);
  });

  it('returns not isometric for different vertex counts', () => {
    const points: Point[] = [
      makePoint('a1', 0, 0),
      makePoint('a2', 30, 0),
      makePoint('a3', 15, 20),
      makePoint('b1', 50, 0),
      makePoint('b2', 80, 0),
      makePoint('b3', 80, 30),
      makePoint('b4', 50, 30),
    ];
    const result = compareFiguresByTranslation(
      ['a1', 'a2', 'a3'],
      ['b1', 'b2', 'b3', 'b4'],
      points,
    );
    expect(result.isIsometric).toBe(false);
    expect(result.correspondences).toHaveLength(0);
  });

  it('returns not isometric for different sized squares', () => {
    const points: Point[] = [
      // 30mm square
      makePoint('a1', 0, 0),
      makePoint('a2', 30, 0),
      makePoint('a3', 30, 30),
      makePoint('a4', 0, 30),
      // 50mm square
      makePoint('b1', 100, 0),
      makePoint('b2', 150, 0),
      makePoint('b3', 150, 50),
      makePoint('b4', 100, 50),
    ];
    const result = compareFiguresByTranslation(
      ['a1', 'a2', 'a3', 'a4'],
      ['b1', 'b2', 'b3', 'b4'],
      points,
    );
    expect(result.isIsometric).toBe(false);
    expect(result.maxDeviationMm).toBeGreaterThan(1);
  });

  it('deviation within tolerance (non-uniform shift survives centroid alignment) passes', () => {
    // Non-uniform shift: each vertex deviates differently so centroid
    // alignment doesn't absorb the deviation entirely
    const points: Point[] = [
      makePoint('a1', 0, 0),
      makePoint('a2', 30, 0),
      makePoint('a3', 15, 20),
      // b1: +0.7mm x, b2: -0.3mm x, b3: +0.6mm x from ideal (50,10)+(0,30,15), (0,0,20)
      // Centroid shift in x = (0.7 - 0.3 + 0.6) / 3 = +0.333mm
      // Residual deviations: 0.7-0.333=0.367, -0.3-(-0.333)=0.033, 0.6-0.333=0.267
      makePoint('b1', 50.7, 10),
      makePoint('b2', 79.7, 10),
      makePoint('b3', 65.6, 30),
    ];
    const result = compareFiguresByTranslation(['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], points);
    expect(result.isIsometric).toBe(true);
    expect(result.maxDeviationMm).toBeGreaterThan(0);
    expect(result.maxDeviationMm).toBeLessThanOrEqual(1.0);
  });

  it('deviation above tolerance (3mm on one vertex) fails', () => {
    const points: Point[] = [
      makePoint('a1', 0, 0),
      makePoint('a2', 30, 0),
      makePoint('a3', 15, 20),
      // b3 is 3mm off vertically from expected position
      makePoint('b1', 50, 10),
      makePoint('b2', 80, 10),
      makePoint('b3', 15 + 50, 20 + 10 + 3),
    ];
    const result = compareFiguresByTranslation(['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], points);
    expect(result.isIsometric).toBe(false);
    expect(result.maxDeviationMm).toBeGreaterThan(1.0);
  });

  it('works with quadrilaterals', () => {
    const points: Point[] = [
      // Parallelogram A
      makePoint('a1', 0, 0),
      makePoint('a2', 40, 0),
      makePoint('a3', 50, 25),
      makePoint('a4', 10, 25),
      // Same parallelogram translated
      makePoint('b1', 70, 5),
      makePoint('b2', 110, 5),
      makePoint('b3', 120, 30),
      makePoint('b4', 80, 30),
    ];
    const result = compareFiguresByTranslation(
      ['a1', 'a2', 'a3', 'a4'],
      ['b1', 'b2', 'b3', 'b4'],
      points,
    );
    expect(result.isIsometric).toBe(true);
    expect(result.maxDeviationMm).toBeCloseTo(0, 1);
  });

  it('returns empty result for zero-length point arrays', () => {
    const result = compareFiguresByTranslation([], [], []);
    expect(result.isIsometric).toBe(false);
    expect(result.correspondences).toHaveLength(0);
  });
});
