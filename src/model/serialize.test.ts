import { serializeState, deserializeState } from './serialize';
import { createInitialState, addPoint, addSegment } from './state';

describe('serializeState / deserializeState', () => {
  it('round-trips empty state', () => {
    const state = createInitialState();
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.points).toEqual([]);
    expect(restored.segments).toEqual([]);
    expect(restored.gridSizeMm).toBe(5);
    expect(restored.displayMode).toBe('simplifie');
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
    expect(parsed.version).toBe(2);
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
      settings: { gridSizeMm: 10, displayMode: 'simplifie', displayUnit: 'cm', snapEnabled: true },
      unknownField: 'should be ignored',
      anotherUnknown: 42,
    });
    const state = deserializeState(json);
    expect(state.gridSizeMm).toBe(10);
  });

  it('uses defaults for missing settings', () => {
    const json = JSON.stringify({ version: 1, points: [], segments: [] });
    const state = deserializeState(json);
    expect(state.gridSizeMm).toBe(5);
    expect(state.displayMode).toBe('simplifie');
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

  it('migrates v1 schoolLevel to v2 displayMode', () => {
    const json = JSON.stringify({
      version: 1,
      points: [],
      segments: [],
      circles: [],
      settings: { gridSizeMm: 10, schoolLevel: '3e_cycle', displayUnit: 'cm', snapEnabled: true },
    });
    const state = deserializeState(json);
    expect(state.displayMode).toBe('complet');
  });

  it('round-trips accessibility settings (toleranceProfile, fontScale, soundMode, soundGain)', () => {
    const state = {
      ...createInitialState(),
      toleranceProfile: 'very_large' as const,
      chainTimeoutMs: 15000 as const,
      fontScale: 1.5 as const,
      keyboardShortcutsEnabled: true,
      soundMode: 'full' as const,
      soundGain: 0.8,
      pointToolVisible: true,
    };
    const restored = deserializeState(serializeState(state));
    expect(restored.toleranceProfile).toBe('very_large');
    expect(restored.chainTimeoutMs).toBe(15000);
    expect(restored.fontScale).toBe(1.5);
    expect(restored.keyboardShortcutsEnabled).toBe(true);
    expect(restored.soundMode).toBe('full');
    expect(restored.soundGain).toBe(0.8);
    expect(restored.pointToolVisible).toBe(true);
  });

  it('round-trips hidePropertiesUserSet flag', () => {
    const state = { ...createInitialState(), hidePropertiesUserSet: true, hideProperties: false };
    const restored = deserializeState(serializeState(state));
    expect(restored.hidePropertiesUserSet).toBe(true);
    expect(restored.hideProperties).toBe(false);
  });

  it('rejects invalid versions (< 1)', () => {
    const json = JSON.stringify({
      version: 0,
      points: [],
      segments: [],
      circles: [],
      settings: {},
    });
    expect(() => deserializeState(json)).toThrow('VERSION_INVALID');
  });

  it('rejects invalid settings values with silent fallback to defaults', () => {
    const json = JSON.stringify({
      version: 2,
      points: [],
      segments: [],
      circles: [],
      settings: {
        toleranceProfile: 'bogus',
        fontScale: 999,
        soundMode: 'loud',
        soundGain: 5, // out of [0,1]
      },
    });
    const state = deserializeState(json);
    expect(state.toleranceProfile).toBe('default');
    expect(state.fontScale).toBe(1);
    expect(state.soundMode).toBe('reduced');
    expect(state.soundGain).toBe(0.5);
  });
});
