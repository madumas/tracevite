import { serializeState, deserializeState } from './serialize';
import { createInitialState, addPoint, addSegment } from './state';

describe('serializeState / deserializeState', () => {
  it('round-trips empty state', () => {
    const state = createInitialState();
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.points).toEqual([]);
    expect(restored.segments).toEqual([]);
    expect(restored.gridSizeMm).toBe(10);
    expect(restored.schoolLevel).toBe('2e_cycle');
  });

  it('round-trips state with points and segments', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.points).toHaveLength(2);
    expect(restored.segments).toHaveLength(1);
    expect(restored.segments[0]!.lengthMm).toBe(50);
  });

  it('includes version field', () => {
    const json = serializeState(createInitialState());
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
  });

  it('throws on invalid JSON', () => {
    expect(() => deserializeState('not json')).toThrow('INVALID_JSON');
  });

  it('throws on version too new', () => {
    const json = JSON.stringify({
      version: 999,
      points: [],
      segments: [],
      circles: [],
      settings: {},
    });
    expect(() => deserializeState(json)).toThrow('VERSION_TOO_NEW');
  });

  it('tolerates unknown fields', () => {
    const json = JSON.stringify({
      version: 1,
      points: [],
      segments: [],
      circles: [],
      settings: { gridSizeMm: 10, schoolLevel: '2e_cycle', displayUnit: 'cm', snapEnabled: true },
      unknownField: 'should be ignored',
      anotherUnknown: 42,
    });
    const state = deserializeState(json);
    expect(state.gridSizeMm).toBe(10);
  });

  it('uses defaults for missing settings', () => {
    const json = JSON.stringify({ version: 1, points: [], segments: [] });
    const state = deserializeState(json);
    expect(state.gridSizeMm).toBe(10);
    expect(state.schoolLevel).toBe('2e_cycle');
    expect(state.displayUnit).toBe('cm');
    expect(state.snapEnabled).toBe(true);
  });

  it('restores consigne', () => {
    const json = JSON.stringify({
      version: 1,
      points: [],
      segments: [],
      circles: [],
      settings: {},
      consigne: 'Trace un carré de 4 cm',
    });
    const state = deserializeState(json);
    expect(state.consigne).toBe('Trace un carré de 4 cm');
  });

  it('resets transient fields', () => {
    const json = serializeState(createInitialState());
    const state = deserializeState(json);
    expect(state.activeTool).toBe('segment');
    expect(state.selectedElementId).toBeNull();
  });
});
