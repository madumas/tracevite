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
 * Uses explicit Math.round() rather than Number.prototype.toFixed() because
 * toFixed has IEEE754-induced surprises on some values — e.g. in V8,
 * (1.005).toFixed(2) returns "1.00", which is visible to the student as a
 * measurement "instability" when dragging a point past a tenth-of-a-millimeter
 * boundary. The manual round keeps the output predictable.
 * @param value - the number to format
 * @param decimals - number of decimal places
 */
function formatFrenchDecimal(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '—';
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  const fixed = rounded.toFixed(decimals);
  return fixed.replace('.', ',');
}

/** Parse a French-formatted number (comma as decimal separator). */
export function parseFrenchNumber(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}
