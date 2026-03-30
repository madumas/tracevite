import { exportSettings, importSettings } from './settings-io';
import { createInitialState } from './state';

describe('settings-io', () => {
  it('round-trips settings', () => {
    const state = createInitialState();
    const json = exportSettings(state);
    const result = importSettings(json);
    expect(result.schoolLevel).toBe('2e_cycle');
    expect(result.displayUnit).toBe('cm');
    expect(result.gridSizeMm).toBe(10);
    expect(result.snapEnabled).toBe(true);
  });

  it('rejects invalid JSON', () => {
    expect(() => importSettings('not json')).toThrow('INVALID_JSON');
  });

  it('rejects wrong file type', () => {
    expect(() => importSettings(JSON.stringify({ type: 'other' }))).toThrow('WRONG_FILE_TYPE');
  });

  it('includes type discriminant', () => {
    const json = exportSettings(createInitialState());
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe('tracevite-settings');
  });

  it('imports partial settings gracefully', () => {
    const json = JSON.stringify({ type: 'tracevite-settings', schoolLevel: '3e_cycle' });
    const result = importSettings(json);
    expect(result.schoolLevel).toBe('3e_cycle');
    expect(result.displayUnit).toBeUndefined(); // Not provided
  });
});
