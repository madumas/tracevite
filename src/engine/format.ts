import type { DisplayUnit } from '@/model/types';

/**
 * Format a length in mm for display with French comma separator.
 * e.g. 45mm → "4,5 cm" or "45 mm"
 */
export function formatLength(mm: number, unit: DisplayUnit): string {
  if (unit === 'cm') {
    const cm = mm / 10;
    return `${formatFrenchDecimal(cm, 1)} cm`;
  }
  return `${formatFrenchDecimal(mm, 1)} mm`;
}

/**
 * Format a coordinate value for display.
 */
export function formatCoordinate(mm: number, unit: DisplayUnit): string {
  if (unit === 'cm') {
    const cm = mm / 10;
    return `${formatFrenchDecimal(cm, 1)}`;
  }
  return `${formatFrenchDecimal(mm, 1)}`;
}

/**
 * Format a number with French comma decimal separator.
 * @param value - the number to format
 * @param decimals - number of decimal places
 */
function formatFrenchDecimal(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  return fixed.replace('.', ',');
}
