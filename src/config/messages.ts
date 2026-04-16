/**
 * All French UI messages — centralized for consistency.
 * Vocabulary follows PFEQ (Programme de Formation de l'École Québécoise).
 */

// ── Status bar messages (spec §10.1) ───────────────────────

export const STATUS_SEGMENT_IDLE = 'Étape 1/2 — Segment — Clique pour placer le premier point';
export const STATUS_SEGMENT_FIRST_PLACED =
  'Étape 2/2 — Segment — Clique pour placer le deuxième point';
export const STATUS_SEGMENT_CHAINING = (label: string) =>
  `Segment — Continue depuis le sommet ${label}.`;

export const STATUS_CIRCLE_IDLE = 'Étape 1/2 — Cercle — Clique pour placer le centre';
export const STATUS_CIRCLE_CENTER_PLACED = 'Étape 2/2 — Cercle — Clique pour fixer le rayon';

export const STATUS_MOVE_IDLE = 'Étape 1/2 — Déplacer — Clique sur un point pour le ramasser';
export const STATUS_MOVE_PICKED = (label: string) =>
  `Étape 2/2 — Déplacer — Clique pour déposer le point ${label}.`;

export const STATUS_REFLECTION_AXIS =
  "Réflexion — Clique deux points pour tracer l'axe de réflexion";
export const STATUS_REFLECTION_SELECT = 'Réflexion — Clique sur une figure pour la refléter';

/**
 * Status for the Point tool in idle state. Context-sensitive (QA 4.1):
 * when a closed figure exists on the canvas, the PFEQ term « Sommet » becomes
 * more precise than the generic « Point » — this matches the vocabulary
 * already used by PropertiesPanel and ContextActionBar for consistency.
 */
export const STATUS_POINT_IDLE = (inFigureContext = false): string =>
  inFigureContext ? 'Sommet — Clique pour placer un sommet' : 'Point — Clique pour placer un point';

// ── Status bar — advanced tools (QA 4.5) ──────────────────
// These are used when the tool hook does not compute its own contextual
// message. The "Étape X/N" prefix supports sequencing/executive function
// for students with DCD. "Agrandir" rather than "Homothétie" in Simplifié
// to match PFEQ primary vocabulary (« homothétie » appears only in 3e cycle).

export const STATUS_PERPENDICULAR_SEGMENT = 'Étape 1/2 — Perpendiculaire — Clique sur un segment';
export const STATUS_PERPENDICULAR_POINT =
  'Étape 2/2 — Perpendiculaire — Clique sur un point de départ';

export const STATUS_PARALLEL_SEGMENT = 'Étape 1/2 — Parallèle — Clique sur un segment';
export const STATUS_PARALLEL_POINT = 'Étape 2/2 — Parallèle — Clique sur un point de départ';

export const STATUS_TRANSLATION_FIGURE = 'Étape 1/3 — Translation — Clique la figure à déplacer';
export const STATUS_TRANSLATION_FROM =
  'Étape 2/3 — Translation — Clique le point de départ de la flèche';
export const STATUS_TRANSLATION_TO =
  "Étape 3/3 — Translation — Clique le point d'arrivée de la flèche";

export const STATUS_ROTATION_FIGURE = 'Étape 1/3 — Rotation — Clique la figure à tourner';
export const STATUS_ROTATION_CENTER = 'Étape 2/3 — Rotation — Clique le centre de rotation';
export const STATUS_ROTATION_ANGLE = "Étape 3/3 — Rotation — Choisis l'angle";

export const STATUS_HOMOTHETY_FIGURE_SIMPLE = 'Étape 1/3 — Agrandir — Clique la figure';
export const STATUS_HOMOTHETY_FIGURE_COMPLET =
  'Étape 1/3 — Agrandir (homothétie) — Clique la figure';
export const STATUS_HOMOTHETY_CENTER = 'Étape 2/3 — Agrandir — Clique le centre';
export const STATUS_HOMOTHETY_FACTOR = 'Étape 3/3 — Agrandir — Choisis la grandeur';

export const STATUS_SYMMETRY_FIGURE = 'Étape 1/2 — Symétrie — Clique la figure';
export const STATUS_SYMMETRY_AXIS = "Étape 2/2 — Symétrie — Clique deux points pour l'axe";

export const STATUS_COMPARE_A = 'Étape 1/2 — Comparer — Clique la première figure';
export const STATUS_COMPARE_B = 'Étape 2/2 — Comparer — Clique la deuxième figure';

export const STATUS_REPRODUCE_SELECT = 'Étape 1/2 — Reproduire — Clique la figure à copier';
export const STATUS_REPRODUCE_PLACE = 'Étape 2/2 — Reproduire — Clique où placer la copie';

export const STATUS_FRIEZE_UNIT = 'Étape 1/3 — Frise — Clique la figure de base';
export const STATUS_FRIEZE_VECTOR1 = 'Étape 2/3 — Frise — Trace la flèche de répétition';
export const STATUS_FRIEZE_VECTOR2 = 'Étape 3/3 — Frise — Trace la deuxième flèche (ou passe)';

export const STATUS_TEXT_PLACE = 'Texte — Clique où tu veux écrire';

// ── Length input ───────────────────────────────────────────

export const LENGTH_PLACEHOLDER = 'Tape une longueur ou clique ailleurs';
export const LENGTH_LABEL = (segLabel: string) => `Longueur du segment ${segLabel} :`;

export const RADIUS_PLACEHOLDER = 'ex: 3,5';

// ── Action bar ────────────────────────────────────────────

export const ACTION_UNDO = 'Annuler';
export const ACTION_REDO = 'Rétablir';
export const ACTION_PRINT = 'Imprimer';
export const ACTION_NEW = 'Nouveau';
export const ACTION_NEW_FULL = 'Nouvelle construction';
export const ACTION_DELETE = 'Supprimer';
export const ACTION_SCALE_NOTE = 'Échelle 1:1 sur papier';

// ── Confirm dialog — new construction ─────────────────────

export const CONFIRM_NEW_TITLE = 'Tu veux commencer une nouvelle construction?';
export const CONFIRM_NEW_SUBTITLE = (name: string) =>
  `Ta construction « ${name} » est sauvegardée. Tu peux la retrouver dans « Mes constructions ».`;
export const CONFIRM_NEW_CANCEL = 'Non, je continue';
export const CONFIRM_NEW_CONFIRM = 'Oui, nouvelle construction';

// ── Transformation hints ──────────────────────────────────

export const PRIME_HINT = "Les points avec ' sont les copies issues de la transformation.";

// ── Toolbar ───────────────────────────────────────────────

export const TOOL_SEGMENT = 'Segment';
export const TOOL_POINT = 'Point';
export const TOOL_CIRCLE = 'Cercle';
export const TOOL_REFLECTION = 'Réflexion';
export const TOOL_MOVE = 'Déplacer';
export const TOOL_SELECT = 'Sélectionner';
export const STATUS_SELECT_IDLE = 'Sélectionner — Clique sur un élément pour voir ses propriétés';
export const TOOL_SNAP = 'Aimant';
export const TOOL_COMPARE = 'Comparer';

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
export const HINT_LABELS_CLUTTERED =
  'Les mesures sont dans le panneau — clique sur un segment pour voir';
