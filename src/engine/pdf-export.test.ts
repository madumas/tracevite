import { constructionBoundingBox, figureFitsInPage, figureIsOffCenter } from './pdf-export';
import { witnessSegmentCoords, PRINTABLE_WIDTH_MM, PRINTABLE_HEIGHT_MM } from './print-shared';
import { createInitialState, addPoint } from '@/model/state';

describe('witnessSegmentCoords', () => {
  it('produces a 50mm segment in portrait', () => {
    const ws = witnessSegmentCoords(false);
    expect(ws.x2 - ws.x1).toBeCloseTo(50);
  });

  it('produces a 50mm segment in landscape', () => {
    const ws = witnessSegmentCoords(true);
    expect(ws.x2 - ws.x1).toBeCloseTo(50);
  });

  it('fits within printable area portrait', () => {
    const ws = witnessSegmentCoords(false);
    expect(ws.x1).toBeGreaterThanOrEqual(0);
    expect(ws.x2).toBeLessThanOrEqual(PRINTABLE_WIDTH_MM);
    expect(ws.y1).toBeLessThanOrEqual(PRINTABLE_HEIGHT_MM);
  });
});

describe('constructionBoundingBox', () => {
  it('returns null for empty state', () => {
    expect(constructionBoundingBox(createInitialState())).toBeNull();
  });

  it('computes bounding box', () => {
    let state = createInitialState();
    state = addPoint(state, 10, 20).state;
    state = addPoint(state, 60, 80).state;

    const bb = constructionBoundingBox(state);
    expect(bb).not.toBeNull();
    expect(bb!.minX).toBe(10);
    expect(bb!.minY).toBe(20);
    expect(bb!.maxX).toBe(60);
    expect(bb!.maxY).toBe(80);
    expect(bb!.width).toBe(50);
    expect(bb!.height).toBe(60);
  });
});

describe('figureFitsInPage', () => {
  it('returns true for small figure', () => {
    let state = createInitialState();
    state = addPoint(state, 10, 10).state;
    state = addPoint(state, 50, 50).state;
    expect(figureFitsInPage(state, false)).toBe(true);
  });

  it('returns false for figure exceeding page', () => {
    let state = createInitialState();
    state = addPoint(state, 10, 10).state;
    state = addPoint(state, 200, 260).state; // Beyond 185.9 × 249.4
    expect(figureFitsInPage(state, false)).toBe(false);
  });

  it('landscape swaps dimensions', () => {
    let state = createInitialState();
    state = addPoint(state, 10, 10).state;
    state = addPoint(state, 200, 160).state; // Fits landscape but not portrait
    expect(figureFitsInPage(state, false)).toBe(false);
    expect(figureFitsInPage(state, true)).toBe(true);
  });
});

describe('figureIsOffCenter', () => {
  it('centered figure is not off-center', () => {
    let state = createInitialState();
    state = addPoint(state, 70, 100).state;
    state = addPoint(state, 120, 150).state;
    expect(figureIsOffCenter(state, false)).toBe(false);
  });

  it('figure in corner is off-center', () => {
    let state = createInitialState();
    state = addPoint(state, 160, 220).state;
    state = addPoint(state, 180, 240).state;
    expect(figureIsOffCenter(state, false)).toBe(true);
  });
});
