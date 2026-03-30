/** Generate a unique ID for construction elements. */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate the next alphabetical label given existing labels.
 * Sequence: A, B, C, ... Z, AA, AB, AC, ... AZ, BA, BB, ...
 * Deleted labels are NOT recycled (spec §17).
 */
export function nextLabel(existingLabels: readonly string[]): string {
  const used = new Set(existingLabels);
  let candidate = '';
  let index = 0;

  do {
    candidate = indexToLabel(index);
    index++;
  } while (used.has(candidate));

  return candidate;
}

/**
 * Convert a zero-based index to a label.
 * 0→A, 1→B, ..., 25→Z, 26→AA, 27→AB, ...
 */
function indexToLabel(index: number): string {
  let result = '';
  let n = index;

  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return result;
}
