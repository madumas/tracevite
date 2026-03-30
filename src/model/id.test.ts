import { generateId, nextLabel } from './id';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('nextLabel', () => {
  it('returns A for empty set', () => {
    expect(nextLabel([])).toBe('A');
  });

  it('returns B when A exists', () => {
    expect(nextLabel(['A'])).toBe('B');
  });

  it('returns C when A and B exist', () => {
    expect(nextLabel(['A', 'B'])).toBe('C');
  });

  it('returns AA after Z', () => {
    const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    expect(nextLabel(letters)).toBe('AA');
  });

  it('returns AB when A-Z and AA exist', () => {
    const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    letters.push('AA');
    expect(nextLabel(letters)).toBe('AB');
  });

  it('skips deleted labels (gaps)', () => {
    // A exists, B was deleted (not in list), C exists
    expect(nextLabel(['A', 'C'])).toBe('B');
  });

  it('handles non-sequential existing labels', () => {
    expect(nextLabel(['A', 'D', 'Z'])).toBe('B');
  });
});
