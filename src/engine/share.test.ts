import { describe, it, expect } from 'vitest';
import { generateShareUrl, parseShareParam } from './share';
import { createInitialState } from '@/model/state';
import { addPoint, addSegment } from '@/model/state';

describe('share encoding/decoding', () => {
  it('roundtrips a triangle with consigne', () => {
    let state = createInitialState();
    const a = addPoint(state, 40, 50);
    state = a.state;
    const b = addPoint(state, 100, 50);
    state = b.state;
    const c = addPoint(state, 70, 90);
    state = c.state;
    state = addSegment(state, a.pointId, b.pointId)!.state;
    state = addSegment(state, b.pointId, c.pointId)!.state;
    state = addSegment(state, c.pointId, a.pointId)!.state;
    state = { ...state, consigne: 'Mesure les angles de ce triangle.' };

    const url = generateShareUrl(state);
    const search = new URL(url).hash;
    const result = parseShareParam(search);

    expect(result).not.toBeNull();
    expect(result!.points).toHaveLength(3);
    expect(result!.segments).toHaveLength(3);
    expect(result!.consigne).toBe('Mesure les angles de ce triangle.');
    expect(result!.displayMode).toBe('simplifie');
    expect(result!.gridSizeMm).toBe(5);

    // Verify point coordinates are preserved (rounded to 0.1mm)
    expect(result!.points[0]!.x).toBe(40);
    expect(result!.points[0]!.y).toBe(50);
    expect(result!.points[0]!.label).toBe('A');
  });

  it('roundtrips empty construction with consigne only', () => {
    let state = createInitialState();
    state = { ...state, consigne: 'Trace un carré de 4 cm.' };

    const url = generateShareUrl(state);
    const result = parseShareParam(new URL(url).hash);

    expect(result).not.toBeNull();
    expect(result!.points).toHaveLength(0);
    expect(result!.segments).toHaveLength(0);
    expect(result!.consigne).toBe('Trace un carré de 4 cm.');
  });

  it('preserves locked points', () => {
    let state = createInitialState();
    const a = addPoint(state, 50, 50);
    state = { ...a.state, points: a.state.points.map((p) => ({ ...p, locked: true })) };

    const url = generateShareUrl(state);
    const result = parseShareParam(new URL(url).hash);

    expect(result!.points[0]!.locked).toBe(true);
  });

  it('preserves complet mode and grid size', () => {
    let state = createInitialState();
    state = { ...state, displayMode: 'complet', gridSizeMm: 10 };

    const url = generateShareUrl(state);
    const result = parseShareParam(new URL(url).hash);

    expect(result!.displayMode).toBe('complet');
    expect(result!.gridSizeMm).toBe(10);
  });

  it('preserves segment color override', () => {
    const state = createInitialState();
    const url = generateShareUrl(state, '#2E7D32');
    const result = parseShareParam(new URL(url).hash);
    expect(result!.segmentColor).toBe('#2E7D32');
  });

  it('returns null for missing param', () => {
    expect(parseShareParam('')).toBeNull();
    expect(parseShareParam('#foo=bar')).toBeNull();
  });

  it('returns null for corrupted data', () => {
    expect(parseShareParam('#s=garbage')).toBeNull();
  });

  it('generates URL under 2000 chars for simple construction', () => {
    let state = createInitialState();
    const a = addPoint(state, 40, 50);
    state = a.state;
    const b = addPoint(state, 100, 50);
    state = b.state;
    const c = addPoint(state, 70, 90);
    state = c.state;
    state = addSegment(state, a.pointId, b.pointId)!.state;
    state = addSegment(state, b.pointId, c.pointId)!.state;
    state = addSegment(state, c.pointId, a.pointId)!.state;
    state = { ...state, consigne: 'Mesure les angles.' };

    const url = generateShareUrl(state);
    expect(url.length).toBeLessThan(2000);
  });
});
