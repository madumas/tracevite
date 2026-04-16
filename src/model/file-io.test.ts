import { exportToTracevite, importFromTracevite, sanitizeFilename, ImportError } from './file-io';
import { createInitialState, addPoint, addSegment } from './state';

describe('exportToTracevite / importFromTracevite', () => {
  it('round-trips empty state', () => {
    const state = createInitialState();
    const json = exportToTracevite(state);
    const restored = importFromTracevite(json);
    expect(restored.points).toEqual([]);
    expect(restored.segments).toEqual([]);
  });

  it('round-trips state with elements', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 10, 20);
    state = p1.state;
    const p2 = addPoint(state, 60, 20);
    state = p2.state;
    state = addSegment(state, p1.pointId, p2.pointId)!.state;

    const json = exportToTracevite(state);
    const restored = importFromTracevite(json);
    expect(restored.points).toHaveLength(2);
    expect(restored.segments).toHaveLength(1);
  });
});

describe('importFromTracevite validation', () => {
  it('rejects invalid JSON', () => {
    expect(() => importFromTracevite('not json')).toThrow(ImportError);
    try {
      importFromTracevite('not json');
    } catch (e) {
      expect((e as ImportError).code).toBe('INVALID_JSON');
    }
  });

  it('rejects missing version', () => {
    expect(() => importFromTracevite('{"points":[]}')).toThrow(ImportError);
  });

  it('rejects version too new', () => {
    const json = JSON.stringify({
      version: 999,
      points: [],
      segments: [],
      circles: [],
      settings: {},
    });
    try {
      importFromTracevite(json);
    } catch (e) {
      expect((e as ImportError).code).toBe('VERSION_TOO_NEW');
    }
  });

  it('rejects too many elements', () => {
    const points = Array.from({ length: 501 }, (_, i) => ({
      id: `p${i}`,
      x: i,
      y: i,
      label: `P${i}`,
      locked: false,
    }));
    const json = JSON.stringify({ version: 1, points, segments: [], circles: [], settings: {} });
    try {
      importFromTracevite(json);
    } catch (e) {
      expect((e as ImportError).code).toBe('TOO_MANY_ELEMENTS');
    }
  });

  it('rejects segments with invalid point references', () => {
    const json = JSON.stringify({
      version: 1,
      points: [{ id: 'p1', x: 0, y: 0, label: 'A', locked: false }],
      segments: [{ id: 's1', startPointId: 'p1', endPointId: 'p_nonexistent', lengthMm: 50 }],
      circles: [],
      settings: {},
    });
    try {
      importFromTracevite(json);
    } catch (e) {
      expect((e as ImportError).code).toBe('INVALID_REFERENCES');
    }
  });

  it('accepts valid file with unknown fields', () => {
    const json = JSON.stringify({
      version: 1,
      points: [],
      segments: [],
      circles: [],
      settings: { gridSizeMm: 10 },
      futureField: 'ignored',
    });
    const state = importFromTracevite(json);
    expect(state.gridSizeMm).toBe(10);
  });
});

describe('sanitizeFilename', () => {
  it('replaces spaces with dashes', () => {
    expect(sanitizeFilename('Construction 1')).toBe('Construction-1');
  });

  it('preserves French typographic apostrophe', () => {
    // Previous implementation silently stripped U+2019 → « Construction-dAlice »;
    // the fix keeps user-recognizable names.
    expect(sanitizeFilename("Construction d'Alice")).toBe("Construction-d'Alice");
    expect(sanitizeFilename('Construction d\u2019Alice')).toBe('Construction-d\u2019Alice');
  });

  it('replaces OS-reserved characters with underscore', () => {
    expect(sanitizeFilename('file<>:"/\\|?*name')).toBe('file_________name');
  });

  it('replaces dots with underscore to avoid double-extension confusion', () => {
    expect(sanitizeFilename('my.file.name')).toBe('my_file_name');
  });

  it('truncates to 100 chars', () => {
    const long = 'a'.repeat(150);
    expect(sanitizeFilename(long).length).toBe(100);
  });

  it('returns default for empty', () => {
    expect(sanitizeFilename('')).toBe('construction');
  });
});
