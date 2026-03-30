import { formatLength, formatCoordinate } from './format';

describe('formatLength', () => {
  it('formats mm to cm with French comma', () => {
    expect(formatLength(45, 'cm')).toBe('4,5 cm');
  });

  it('formats whole cm without trailing zero removal', () => {
    expect(formatLength(50, 'cm')).toBe('5,0 cm');
  });

  it('formats in mm', () => {
    expect(formatLength(45, 'mm')).toBe('45,0 mm');
  });

  it('formats zero', () => {
    expect(formatLength(0, 'cm')).toBe('0,0 cm');
  });

  it('rounds to 1 decimal', () => {
    expect(formatLength(45.67, 'cm')).toBe('4,6 cm');
  });

  it('formats small value in cm', () => {
    expect(formatLength(5, 'cm')).toBe('0,5 cm');
  });
});

describe('formatCoordinate', () => {
  it('formats coordinate in cm', () => {
    expect(formatCoordinate(100, 'cm')).toBe('10,0');
  });

  it('formats coordinate in mm', () => {
    expect(formatCoordinate(100, 'mm')).toBe('100,0');
  });
});
