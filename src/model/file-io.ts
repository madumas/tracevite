/**
 * .geomolo file export/import with validation.
 * Export: state → JSON string. Import: JSON string → validated state.
 */

import type { ConstructionState } from './types';
import { serializeState, deserializeState } from './serialize';
import { FILE_VERSION } from './types';

const MAX_IMPORT_ELEMENTS = 500;

/** Export construction to .geomolo JSON string. */
export function exportToTracevite(state: ConstructionState): string {
  return serializeState(state);
}

/**
 * Import from .geomolo JSON string with full validation.
 * Returns validated ConstructionState or throws with a French error message key.
 */
export function importFromTracevite(json: string): ConstructionState {
  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ImportError('INVALID_JSON');
  }

  if (!data || typeof data !== 'object') {
    throw new ImportError('INVALID_FORMAT');
  }

  const obj = data as Record<string, unknown>;

  // Reject settings files opened as construction
  if (obj['type'] === 'geomolo-settings' || obj['type'] === 'tracevite-settings') {
    throw new ImportError('WRONG_FILE_TYPE');
  }

  // Version check
  if (typeof obj['version'] !== 'number') {
    throw new ImportError('MISSING_VERSION');
  }
  if (obj['version'] > FILE_VERSION) {
    throw new ImportError('VERSION_TOO_NEW');
  }

  // Element count check
  const pointCount = Array.isArray(obj['points']) ? obj['points'].length : 0;
  const segmentCount = Array.isArray(obj['segments']) ? obj['segments'].length : 0;
  const circleCount = Array.isArray(obj['circles']) ? obj['circles'].length : 0;
  if (pointCount + segmentCount + circleCount > MAX_IMPORT_ELEMENTS) {
    throw new ImportError('TOO_MANY_ELEMENTS');
  }

  // Deserialize (handles defaults, validation, forward-compat)
  const state = deserializeState(json);

  // Referential integrity: check segments point to existing point IDs
  const pointIds = new Set(state.points.map((p) => p.id));
  for (const seg of state.segments) {
    if (!pointIds.has(seg.startPointId) || !pointIds.has(seg.endPointId)) {
      throw new ImportError('INVALID_REFERENCES');
    }
  }
  for (const circle of state.circles) {
    if (!pointIds.has(circle.centerPointId)) {
      throw new ImportError('INVALID_REFERENCES');
    }
  }

  return state;
}

/** Sanitize a filename: spaces → dashes, remove special chars. */
export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\-_]/g, '')
      .slice(0, 100) || 'construction'
  );
}

/** Map import error codes to French messages. */
export function getImportErrorMessage(code: string): string {
  switch (code) {
    case 'INVALID_JSON':
    case 'INVALID_FORMAT':
    case 'MISSING_VERSION':
      return "Ce fichier ne peut pas être ouvert. Vérifie que c'est bien un fichier .geomolo.";
    case 'VERSION_TOO_NEW':
      return "Ce fichier a été créé avec une version plus récente de GéoMolo. Mets à jour l'application pour l'ouvrir.";
    case 'TOO_MANY_ELEMENTS':
      return "Ce fichier contient trop d'éléments (maximum 500).";
    case 'INVALID_REFERENCES':
      return 'Ce fichier contient des données invalides.';
    default:
      return "Erreur lors de l'ouverture du fichier.";
  }
}

export class ImportError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'ImportError';
  }
}

/** Trigger browser download of a string as a file. */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
