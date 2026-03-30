/**
 * All French UI messages — centralized for consistency.
 * Vocabulary follows PFEQ (Programme de Formation de l'École Québécoise).
 */

// ── Status bar messages (spec §10.1) ───────────────────────

export const STATUS_SEGMENT_IDLE = 'Segment — Clique pour placer le premier point';
export const STATUS_SEGMENT_FIRST_PLACED = 'Segment — Clique pour placer le deuxième point';
export const STATUS_SEGMENT_CHAINING = (label: string) =>
  `Segment — Continue depuis le sommet ${label}. Clique ailleurs ou appuie Échap pour terminer.`;

export const STATUS_CIRCLE_IDLE = 'Cercle — Clique pour placer le centre';
export const STATUS_CIRCLE_CENTER_PLACED = 'Cercle — Clique pour fixer le rayon';

export const STATUS_MOVE_IDLE = 'Déplacer — Clique sur un point pour le ramasser';
export const STATUS_MOVE_PICKED = (label: string) =>
  `Déplacer — Clique pour déposer le point ${label}. Appuie Échap pour annuler.`;

export const STATUS_REFLECTION_AXIS =
  "Réflexion — Clique deux points pour tracer l'axe de symétrie";
export const STATUS_REFLECTION_SELECT = 'Réflexion — Clique sur une figure pour la refléter';

export const STATUS_MEASURE_IDLE = 'Mesurer — Clique sur un segment pour fixer sa longueur';

// ── Length input ───────────────────────────────────────────

export const LENGTH_PLACEHOLDER = 'Tape une longueur ou clique ailleurs';
export const LENGTH_LABEL = (segLabel: string) => `Longueur du segment ${segLabel} :`;

// ── Action bar ────────────────────────────────────────────

export const ACTION_UNDO = 'Annuler';
export const ACTION_REDO = 'Rétablir';
export const ACTION_PRINT = 'Imprimer';
export const ACTION_NEW = 'Nouvelle construction';
export const ACTION_DELETE = 'Supprimer';
export const STATUS_DELETE_MODE = 'Supprimer — Clique sur un élément pour le supprimer';
export const STATUS_DELETE_CONFIRM = (label: string) =>
  `Supprimer ${label}? Clique à nouveau pour confirmer.`;
export const ACTION_SCALE_NOTE = 'Échelle 1:1 sur papier';

// ── Confirm dialog — new construction ─────────────────────

export const CONFIRM_NEW_TITLE = 'Tu veux commencer une nouvelle figure?';
export const CONFIRM_NEW_SUBTITLE = (name: string) =>
  `Ta figure « ${name} » est sauvegardée. Tu peux la retrouver dans « Mes constructions ».`;
export const CONFIRM_NEW_CANCEL = 'Non, je continue';
export const CONFIRM_NEW_CONFIRM = 'Oui, nouvelle figure';

// ── Toolbar ───────────────────────────────────────────────

export const TOOL_SEGMENT = 'Segment';
export const TOOL_POINT = 'Point';
export const TOOL_CIRCLE = 'Cercle';
export const TOOL_REFLECTION = 'Réflexion';
export const TOOL_MOVE = 'Déplacer';
export const TOOL_MEASURE = 'Mesurer';
export const TOOL_SNAP = 'Aimant';

// ── Mode selector ─────────────────────────────────────────

export const MODE_SIMPLIFIE_LABEL = 'Simplifié';
export const MODE_SIMPLIFIE_DETAIL = 'Affichage essentiel (correspond au 2e cycle)';
export const MODE_COMPLET_LABEL = 'Complet';
export const MODE_COMPLET_DETAIL = 'Toutes les mesures et outils (correspond au 3e cycle)';

// ── Grid sizes ────────────────────────────────────────────

export const GRID_5MM = '5 mm';
export const GRID_1CM = '1 cm';
export const GRID_2CM = '2 cm';

// ── Edge case messages (spec §17) ─────────────────────────

export const HINT_SEGMENT_TOO_SHORT = 'Clique un peu plus loin pour tracer un segment';

// ── Save indicator ────────────────────────────────────────

export const SAVE_SAVED = 'Sauvegardé';
export const SAVE_SAVING = 'Sauvegarde…';
