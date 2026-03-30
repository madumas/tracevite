# TraceVite — Spécifications complètes

## 1. Vision produit

TraceVite est un outil de construction géométrique numérique conçu pour les enfants du primaire ayant un Trouble Développemental de la Coordination (TDC/dyspraxie). Il remplace les instruments physiques (règle, compas, rapporteur) que l'enfant TDC ne peut pas manipuler avec précision, tout en préservant la réflexion géométrique.

**Analogie fondamentale** : TraceVite est à la règle et au compas ce que la calculatrice est au calcul mental. L'enfant fait le raisonnement, l'outil exécute le geste.

**Analogie d'interaction** : L'enfant construit comme avec des bâtons sur une table. Il place des segments librement, les ajuste, les connecte. L'outil l'assiste silencieusement (mesures, accrochage, détection de propriétés) mais ne prend jamais de décision à sa place.

---

## 2. Profil utilisateur

- Enfant de 8 à 12 ans (2e et 3e cycle du primaire québécois)
- Diagnostic de TDC (dyspraxie)
- Accès à un ordinateur en classe (mesure d'adaptation scolaire existante)
- Comprend les concepts géométriques, réussit à construire des figures avec des bâtons physiques
- Blocage spécifique : le passage du 3D manipulable (bâtons) au 2D tracé (papier) est très difficile
- Utilise l'outil comme une "calculatrice géométrique" : construction à l'écran → impression → remise sur papier

---

## 3. Alignement curriculaire — Programme de formation de l'école québécoise (PFEQ)

L'outil couvre les champs Géométrie et Mesure de la Progression des apprentissages (PDA) du primaire.

### 3.1 Constructions de figures planes (priorité 1 — coeur de l'outil)

#### 2e cycle (3e-4e année)
- Construire des polygones convexes et non convexes
- Construire des droites parallèles et perpendiculaires
- Construire des quadrilatères avec contraintes : parallélisme, perpendicularité, angle droit, angle aigu, angle obtus
- Construire des figures isométriques

#### 3e cycle (5e-6e année)
- Construire des triangles : scalène, rectangle, isocèle, équilatéral
- Construire des cercles avec rayon, diamètre, angle au centre
- Construire des figures dans le plan cartésien (1er quadrant en 5e, 4 quadrants en 6e)

### 3.2 Mesure intégrée (priorité 1 — affichée automatiquement pendant la construction)
- Longueurs de segments en cm (avec mm au 2e cycle et au-delà)
- Angles en degrés avec classification automatique (aigu < 90°, droit = 90°, obtus > 90°)
- Périmètre des figures fermées
- Aire des figures fermées (pour les figures dont la formule est connue)

### 3.3 Transformations (priorité 2)
- Réflexion par rapport à un axe (2e cycle)
- Translation par flèche de translation (3e cycle)
- Production de frises et dallages

### 3.4 Plan cartésien (priorité 2)
- Mode 1er quadrant (5e année)
- Mode 4 quadrants (6e année)
- Placement de points par coordonnées
- Traçage de figures entre points

### 3.5 Développements de solides (priorité 3 — futur)
- Visualisation 3D de prismes et pyramides
- Dépliage en patron 2D
- Association patron ↔ solide

---

## 4. Architecture technique

### 4.1 Plateforme
- Application web (React + TypeScript)
- Fonctionne dans un navigateur moderne (Chrome, Edge, Firefox)
- Aucune installation requise (l'enfant a déjà un ordinateur en classe)
- Responsive mais optimisé pour écran de laptop (1366x768 minimum)
- Pas de backend requis : tout est client-side
- Données non persistantes (pas de compte, pas de sauvegarde cloud). L'export PDF est la sortie.

### 4.2 Stack technique
- React 18+ avec TypeScript
- Canvas HTML5 (via une librairie de dessin 2D) ou SVG interactif pour le canevas de construction
- Librairie recommandée pour le canevas : évaluer Konva.js (React Konva) ou Fabric.js pour la gestion des objets interactifs (drag, snap, hit detection). Alternativement, SVG pur avec gestion d'événements maison si les librairies s'avèrent trop lourdes pour le cas d'usage.
- jsPDF ou équivalent pour la génération PDF côté client
- Pas de dépendance serveur

### 4.3 Structure de fichiers suggérée
```
src/
  components/
    App.tsx                    # Layout principal
    Toolbar.tsx                # Barre d'outils (segment, point, cercle, etc.)
    Canvas.tsx                 # Canevas de construction interactif
    PropertiesPanel.tsx        # Panneau latéral droit (mesures, propriétés)
    PrintButton.tsx            # Bouton + logique d'export PDF
  engine/
    geometry.ts                # Calculs géométriques purs (distances, angles, intersections)
    snap.ts                    # Logique d'accrochage (grille, sommets, parallélisme, perpendicularité)
    properties.ts              # Détection automatique de propriétés (parallélisme, types d'angles, classification de figures)
    pdf-export.ts              # Génération du PDF à l'échelle 1:1
  model/
    types.ts                   # Types : Point, Segment, Circle, Figure, Angle
    state.ts                   # État global de la construction (liste de primitives, historique undo)
  hooks/
    useConstruction.ts         # Hook principal de gestion de la construction
    useSnap.ts                 # Hook d'accrochage
    useUndo.ts                 # Hook undo/redo
  styles/
    theme.ts                   # Variables de couleurs, tailles
```

---

## 5. Modèle de données

### 5.1 Primitives géométriques

```typescript
interface Point {
  id: string;
  x: number;          // en millimètres (unité interne)
  y: number;          // en millimètres
  label?: string;     // "A", "B", "C"... attribué automatiquement
  locked: boolean;    // point verrouillé (ne peut plus être déplacé)
}

interface Segment {
  id: string;
  startPointId: string;
  endPointId: string;
  lengthMm: number;        // longueur calculée en mm
  fixedLength?: number;     // si l'utilisateur a fixé une longueur exacte (en mm)
}

interface Circle {
  id: string;
  centerPointId: string;
  radiusMm: number;
}

interface AngleInfo {
  vertexPointId: string;
  ray1PointId: string;
  ray2PointId: string;
  degrees: number;
  classification: 'aigu' | 'droit' | 'obtus' | 'plat' | 'rentrant';
}

interface DetectedProperty {
  type: 'parallel' | 'perpendicular' | 'right_angle' | 'congruent_sides' | 'congruent_angles';
  involvedIds: string[];    // IDs des segments ou points concernés
  label: string;            // Texte lisible : "AB // CD", "Angle droit en B"
}

interface ConstructionState {
  points: Point[];
  segments: Segment[];
  circles: Circle[];
  detectedAngles: AngleInfo[];
  detectedProperties: DetectedProperty[];
  gridSizeMm: number;          // taille d'un carreau en mm (défaut : 10mm = 1cm)
  snapEnabled: boolean;
  activeTool: ToolType;
  history: HistoryEntry[];      // pour undo/redo
  historyIndex: number;
}

type ToolType = 
  | 'segment' 
  | 'point' 
  | 'circle' 
  | 'perpendicular'   // tracer une perpendiculaire à un segment existant
  | 'parallel'         // tracer une parallèle à un segment existant
  | 'move'             // déplacer un point existant
  | 'measure'          // cliquer sur un segment pour fixer sa longueur
  | 'select';          // sélectionner un élément pour le modifier/supprimer
```

### 5.2 Unités internes

Toutes les coordonnées et mesures internes sont en millimètres. C'est l'unité de référence qui garantit la fidélité à l'impression 1:1.

Conversion affichage :
- Sur le canevas à l'écran : 1 mm interne = `(canvasPixelWidth / viewportWidthMm)` pixels
- Sur le PDF : 1 mm interne = 1 mm physique (c'est le point critique)
- Affichage utilisateur : toujours en cm avec 1 décimale (ex : "4,5 cm"). Utiliser la virgule, pas le point (contexte francophone).

---

## 6. Interaction détaillée — Mode libre (mode principal)

### 6.1 Outil Segment (outil par défaut)

**Créer un segment :**
1. L'utilisateur clique sur le canevas → un premier point est placé (snap à la grille si accrochage activé)
2. L'utilisateur déplace la souris → un segment fantôme (semi-transparent) s'étire en temps réel depuis le premier point
3. Pendant le déplacement :
   - La longueur du segment s'affiche en temps réel près du curseur (en cm, 1 décimale)
   - Si le segment s'approche d'une orientation parallèle à un segment existant (tolérance ±5°), un indicateur visuel apparaît (ligne-guide en pointillé vert + bulle "parallèle à AB")
   - Si le segment s'approche d'une orientation perpendiculaire à un segment existant (tolérance ±5°), même indicateur en pointillé vert + bulle "perpendiculaire à CD"
   - Si le curseur s'approche d'un point existant (tolérance : 15 pixels à l'écran), le point s'agrandit visuellement (snap magnétique) et le segment s'y connectera automatiquement
4. L'utilisateur clique une deuxième fois → le segment est créé
5. Si le deuxième clic est sur un point existant, le segment s'y connecte (les deux segments partagent ce point)
6. Après création, le nouveau point devient automatiquement le point de départ d'un potentiel segment suivant (chaînage). Un clic sur un espace vide ou Escape annule le chaînage.

**Connecter pour fermer une figure :**
- Si le dernier point d'un segment se connecte au premier point de la chaîne, la figure est fermée
- Une figure fermée déclenche le calcul automatique du périmètre et de l'aire

### 6.2 Outil Point
- Clic simple → place un point libre sur le canevas
- Utilisé pour marquer des points de repère avant de tracer des segments

### 6.3 Outil Cercle
1. Clic pour placer le centre
2. Glisser pour définir le rayon (affiché en temps réel)
3. Clic pour confirmer
4. Possibilité de fixer le rayon à une valeur exacte via le panneau latéral

### 6.4 Outil Perpendiculaire
1. L'utilisateur clique sur un segment existant (il se met en surbrillance)
2. L'utilisateur clique sur un point par lequel la perpendiculaire doit passer (point existant ou nouveau point sur le segment)
3. L'outil trace automatiquement un segment perpendiculaire. L'utilisateur définit la longueur en étirant.

### 6.5 Outil Parallèle
1. L'utilisateur clique sur un segment existant (il se met en surbrillance)
2. L'utilisateur clique à l'endroit où la parallèle doit passer
3. L'outil trace automatiquement un segment parallèle de même longueur. L'utilisateur peut ajuster la longueur.

### 6.6 Outil Déplacer
- Clic-glissé sur un point → déplace le point et tous les segments connectés suivent
- Toutes les mesures (longueurs, angles) se mettent à jour en temps réel pendant le déplacement
- Les propriétés détectées (parallélisme, etc.) se mettent à jour en temps réel
- Si un point est snappé à la grille, le déplacement reste snappé

### 6.7 Outil Mesurer / Fixer
- Clic sur un segment → le champ "longueur" dans le panneau latéral devient éditable
- L'utilisateur tape une valeur exacte (ex : "5") → le segment s'ajuste automatiquement à 5 cm
- Le point le plus récemment créé se déplace pour respecter la longueur fixée (l'autre extrémité reste ancrée)

### 6.8 Sélection et suppression
- Clic droit sur un élément (segment, point, cercle) → menu contextuel : Supprimer, Fixer longueur, Verrouiller point
- Touche Delete/Backspace sur un élément sélectionné → suppression
- Supprimer un point supprime aussi tous les segments connectés à ce point

---

## 7. Système d'accrochage (snap)

Le snap est activé par défaut. Bouton toggle dans la barre supérieure.

### 7.1 Types d'accrochage (par priorité)

1. **Snap aux points existants** (priorité la plus haute, tolérance : 15px écran)
   - Quand le curseur approche d'un point existant, le curseur "saute" dessus
   - Feedback visuel : le point cible s'agrandit et un cercle de halo apparaît

2. **Snap à la grille** (priorité 2, tolérance : 8px écran)
   - La grille est de 1 cm par défaut (modifiable : 0,5 cm ou 2 cm)
   - Le point se place à l'intersection de grille la plus proche
   - Feedback visuel : petit point vert à l'intersection cible

3. **Snap d'angle** (priorité 3, tolérance : ±5° de l'angle cible)
   - Quand un segment en cours de création s'approche de 0°, 30°, 45°, 60°, 90°, 120°, 135°, 150°, 180° par rapport à l'horizontale : guide en pointillé
   - Quand le segment s'approche d'être parallèle ou perpendiculaire à un segment existant : guide en pointillé + étiquette
   - Feedback visuel : ligne-guide verte en pointillé + bulle d'information

4. **Snap d'alignement** (priorité 4, tolérance : 5px écran)
   - Si le curseur s'aligne verticalement ou horizontalement avec un point existant : guide en pointillé gris

### 7.2 Verrouillage
- Quand un snap d'angle est actif (parallèle, perpendiculaire, angle rond), l'utilisateur peut cliquer pour verrouiller la contrainte
- Un segment verrouillé en parallèle reste parallèle même si on déplace ses points
- Feedback visuel : petite icône de cadenas sur le segment verrouillé

---

## 8. Feedback visuel en temps réel

### 8.1 Longueurs
- Chaque segment affiche sa longueur en cm (1 décimale) au milieu du segment, légèrement décalé
- Pendant la construction : la longueur s'actualise en temps réel
- Police : petite, lisible mais non intrusive (11px, couleur secondaire)
- Format : virgule décimale, "cm" comme unité (ex : "4,5 cm")

### 8.2 Angles
- Chaque angle formé par deux segments connectés affiche :
  - Un arc de mesure (petit arc entre les deux segments, rayon ~15px écran)
  - La valeur en degrés (ex : "90°")
  - Le type en couleur :
    - Angle droit : couleur verte + petit carré conventionnel au sommet
    - Angle aigu : couleur ambre/orange
    - Angle obtus : couleur ambre/orange
- La classification apparaît aussi dans le panneau latéral

### 8.3 Propriétés détectées
Affichées dans le panneau latéral droit en temps réel :
- Parallélisme : étiquette verte "AB // CD" + doubles barres conventionnelles (//) sur les segments concernés sur le canevas
- Perpendicularité : étiquette verte "AB ⊥ CD" + petit carré au point d'intersection
- Angle droit : étiquette verte "Angle droit en B"
- Côtés isométriques : étiquette "AB = CD" + marques de hachure conventionnelles sur les segments
- Figure fermée : nom de la figure si détectée (ex : "Parallélogramme", "Trapèze", "Triangle rectangle")

### 8.4 Algorithmes de détection de propriétés

**Parallélisme :** Deux segments sont considérés parallèles si l'angle entre leurs directions est < 0,5°. Utiliser le produit vectoriel normalisé pour la détection.

**Perpendicularité :** Deux segments sont perpendiculaires si l'angle entre eux est dans l'intervalle [89,5°, 90,5°].

**Classification des angles :**
- Aigu : ]0°, 90°[
- Droit : [89,5°, 90,5°] (tolérance pour les constructions manuelles)
- Obtus : ]90°, 180°[
- Plat : [179,5°, 180,5°]

**Classification des figures fermées :** Quand une figure est fermée (cycle de segments connectés), tenter d'identifier :
- 3 côtés : Triangle → sous-classifier en équilatéral (3 côtés égaux), isocèle (2 côtés égaux), rectangle (1 angle droit), scalène (aucune propriété spéciale)
- 4 côtés : Quadrilatère → sous-classifier en carré (4 côtés égaux + 4 angles droits), rectangle (4 angles droits), losange (4 côtés égaux), parallélogramme (2 paires de côtés parallèles), trapèze (1 paire de côtés parallèles), quadrilatère quelconque
- 5+ côtés : Polygone à N côtés
- Tolérance pour "égal" entre longueurs : ±1mm. Tolérance pour "angle droit" : ±0,5°.

**Périmètre :** Somme des longueurs de tous les segments formant le contour de la figure fermée.

**Aire :** Formule du lacet (shoelace formula) pour les polygones. Pour les polygones simples non auto-intersectants :
```
Aire = 0.5 * |Σ(x_i * y_{i+1} - x_{i+1} * y_i)|
```

---

## 9. Panneau latéral droit (Properties Panel)

Toujours visible. Largeur fixe de ~200px. Contient, de haut en bas :

### 9.1 Section "Segments"
Liste de tous les segments avec :
- Étiquette (ex : "AB")
- Longueur en cm

### 9.2 Section "Angles"
Liste de tous les angles détectés avec :
- Sommet (ex : "A")
- Mesure en degrés
- Classification (aigu/droit/obtus) avec code couleur

### 9.3 Section "Propriétés détectées"
Liste de badges/étiquettes :
- Parallélismes (ex : badge vert "AB // CD")
- Angles droits (ex : badge vert "Angle droit en B")
- Côtés isométriques
- Nom de la figure fermée si détectée

### 9.4 Section "Mesures"
- Périmètre (si figure fermée)
- Aire (si figure fermée et calculable)

### 9.5 Section "Longueur du segment" (contextuelle)
- Apparaît quand un segment est sélectionné
- Champ de saisie pour fixer une longueur exacte
- Bouton "Fixer"

---

## 10. Barre d'outils supérieure (Toolbar)

Barre horizontale en haut du canevas. Icônes + texte pour chaque outil.

De gauche à droite :
1. **Segment** (outil par défaut, icône : ligne diagonale)
2. **Point** (icône : point/cercle plein)
3. **Cercle** (icône : cercle vide)
4. Séparateur vertical
5. **Perpendiculaire** (icône : angle droit)
6. **Parallèle** (icône : deux lignes horizontales)
7. Séparateur vertical
8. **Déplacer** (icône : flèche de déplacement)
9. **Mesurer** (icône : règle diagonale)

À droite de la barre :
- Toggle "Accrochage" (on/off)
- Sélecteur de grille (0,5 cm / 1 cm / 2 cm)

---

## 11. Barre inférieure (Action bar)

De gauche à droite :
- Bouton "Annuler" (Ctrl+Z) — undo
- Bouton "Rétablir" (Ctrl+Y) — redo
- Bouton "Effacer tout" (avec confirmation)
- Espace flexible
- Note "Échelle 1:1 sur papier"
- Bouton "Imprimer" (proéminent, couleur bleue)

---

## 12. Export PDF — Impression à l'échelle 1:1

C'est le point le plus critique de tout le projet. Si un segment de 5 cm à l'écran ne mesure pas 5 cm sur le papier imprimé, l'outil est inutilisable en contexte scolaire.

### 12.1 Spécifications du PDF

- Format de page : Lettre US (8,5" × 11" / 215,9mm × 279,4mm) — standard au Québec
- Marges : 15mm de chaque côté
- Zone imprimable : 185,9mm × 249,4mm
- Le contenu SVG/Canvas est converti en PDF vectoriel (pas en image raster)
- Les coordonnées internes (en mm) sont mappées directement aux unités PDF (1 unité PDF = 1/72 pouce, donc 1 mm = 72/25,4 ≈ 2,835 unités PDF)

### 12.2 Contenu du PDF

- La figure telle que construite, avec :
  - Les segments en traits pleins noirs (épaisseur : 0,5mm)
  - Les points aux sommets (petits cercles pleins noirs, rayon 1mm)
  - Les étiquettes des sommets (A, B, C...) en police sans-serif 10pt
  - Les longueurs de segments affichées (en cm, police 8pt, couleur gris foncé)
  - Les mesures d'angle avec arc et valeur en degrés (police 8pt)
  - Le carré conventionnel pour les angles droits
  - Les marques de parallélisme (//) sur les segments parallèles
  - Les marques de congruence (hachures) sur les segments isométriques
- PAS de grille sur le PDF (la figure doit être propre, comme tracée à la main avec instruments)
- PAS de couleur sur le PDF (impression N&B en milieu scolaire)
- En bas à gauche du PDF, petite note : "TraceVite — Échelle 1:1"

### 12.3 Option : grille sur le PDF
- Un toggle dans l'interface permet d'inclure la grille dans le PDF (utile pour certains exercices sur papier quadrillé)
- Si activée, la grille est en gris très pâle (10% noir)

### 12.4 Implémentation technique
- Utiliser jsPDF avec le plugin svg2pdf.js pour convertir le SVG du canevas en PDF vectoriel
- Alternative : générer le PDF programmatiquement avec les coordonnées en mm converties en unités PDF
- CRITIQUE : ne pas utiliser de conversion via image/raster (canvas.toDataURL) car la précision dimensionnelle serait perdue
- CRITIQUE : le PDF doit être configuré pour s'imprimer sans mise à l'échelle. Ajouter un viewer preference `/PrintScaling /None` dans le PDF si l'API le permet. Sinon, afficher un avertissement à l'utilisateur : "Imprimez à taille réelle (100%), sans ajustement à la page."

### 12.5 Validation de l'échelle
- Inclure un segment-témoin de 5 cm dans le coin inférieur droit du PDF, avec la mention "vérification : ce segment mesure 5 cm". Permet à l'enseignant (et à l'enfant) de valider que l'impression est à l'échelle.

---

## 13. Interface utilisateur — Spécifications visuelles

### 13.1 Layout général

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] TraceVite            Mode libre     [Accrochage ON] │  ← Header
├─────────────────────────────────────────────────────────┤
│ [Segment] [Point] [Cercle] | [⊥] [//] | [Déplacer] [📏] │ ← Toolbar
├──────────────────────────────────────────┬──────────────┤
│                                          │ Segments     │
│                                          │  AB  5 cm    │
│                                          │  BC  3,5 cm  │
│           CANEVAS DE CONSTRUCTION        │              │
│             (grille 1 cm)                │ Angles       │
│                                          │  A  97° obtus│
│                                          │  B  90° droit│
│                                          │              │
│                                          │ Propriétés   │
│                                          │  [AB // CD]  │
│                                          │              │
│                                          │ Périmètre    │
│                                          │  16,1 cm     │
│                                          │              │
│                                          │ [Fixer long.]│
├──────────────────────────────────────────┴──────────────┤
│ [Annuler] [Rétablir] [Effacer]        1:1  [Imprimer]  │  ← Action bar
└─────────────────────────────────────────────────────────┘
```

### 13.2 Palette de couleurs

Utiliser un thème clair par défaut (cohérent avec le milieu scolaire).

| Élément | Couleur |
|---------|---------|
| Segments (tracés) | Bleu foncé (#185FA5) |
| Points (sommets) | Bleu foncé (#185FA5) |
| Segment en cours de création (fantôme) | Bleu clair semi-transparent (#85B7EB, 60% opacité) |
| Grille | Gris très pâle (#E5E5E5, 50% opacité) |
| Guides d'accrochage (parallèle, perpendiculaire) | Vert (#0F6E56) en pointillé |
| Arc d'angle droit | Vert (#0F6E56) |
| Arc d'angle aigu/obtus | Orange (#D85A30) |
| Mesures de longueur (texte) | Gris bleuté (#4A6FA5) |
| Fond du canevas | Blanc |
| Fond du panneau latéral | Gris très clair (background-secondary) |
| Bouton Imprimer | Bleu plein (#185FA5, texte blanc) |
| Outil actif | Fond bleu pâle (#E6F1FB) + bordure bleue |

### 13.3 Typographie

- Police système : sans-serif (system-ui, -apple-system, etc.)
- Étiquettes sur le canevas : 12px pour les noms de sommets, 11px pour les mesures
- Panneau latéral : 12px pour le contenu, 11px pour les titres de section (uppercase, letter-spacing)
- Barre d'outils : 12px

### 13.4 Considérations TDC pour l'interface

- **Zones de clic larges** : tous les boutons au minimum 44×44px (recommandation accessibilité tactile)
- **Pas de double-clic** : toutes les actions sont en clic simple
- **Pas de geste de précision** : le snap compense le manque de précision motrice
- **Feedback visuel immédiat** : chaque action a un retour visuel dans les 16ms (pas de latence perceptible)
- **Pas de menus déroulants imbriqués** : tous les outils sont visibles d'un coup
- **Couleurs distinctes** : les codes couleur (vert = droit/parallèle, orange = aigu/obtus) sont suffisamment contrastés pour être distingués même en cas de daltonisme partiel (contraste WCAG AA)
- **Tolérance d'erreur** : undo illimité (Ctrl+Z), pas de perte de travail accidentelle

---

## 14. Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| S | Outil Segment |
| P | Outil Point |
| C | Outil Cercle |
| V | Outil Déplacer |
| M | Outil Mesurer |
| Escape | Annuler l'action en cours / désélectionner |
| Delete ou Backspace | Supprimer l'élément sélectionné |
| Ctrl+Z | Annuler |
| Ctrl+Y ou Ctrl+Shift+Z | Rétablir |
| Ctrl+P | Imprimer (export PDF) |
| G | Toggle accrochage grille |
| Shift (maintenu) | Contraindre l'angle à 15° incréments pendant le traçage |

---

## 15. Undo / Redo

- Chaque action modifiant l'état est enregistrée dans l'historique
- Actions enregistrées : ajout de point, ajout de segment, déplacement de point, suppression, fixation de longueur, verrouillage de contrainte
- Profondeur : 50 niveaux minimum
- Ctrl+Z retire la dernière action, Ctrl+Y la rétablit
- "Effacer tout" est une action unique dans l'historique (annulable d'un seul Ctrl+Z)

---

## 16. Cas d'usage détaillés (scénarios de test)

### 16.1 Construire un carré de 4 cm
1. Sélectionner l'outil Segment
2. Cliquer sur le canevas → point A
3. Tirer vers la droite, la longueur affiche "4,0 cm" → cliquer → point B, segment AB créé
4. Depuis B, tirer vers le bas, le guide de perpendicularité apparaît (vert), longueur "4,0 cm" → cliquer → point C
5. Depuis C, tirer vers la gauche, le guide de parallélisme avec AB apparaît, longueur "4,0 cm" → cliquer → point D
6. Depuis D, tirer vers A, le snap au point A s'active → cliquer sur A → figure fermée
7. Le panneau affiche : "Carré détecté", périmètre 16 cm, aire 16 cm², 4 angles droits, 2 paires de côtés parallèles
8. Clic sur Imprimer → PDF généré avec le carré propre, à l'échelle, mesurable à la règle

### 16.2 Construire une figure avec un angle obtus et des côtés parallèles
1. Tracer un premier segment AB horizontal de 5 cm
2. Depuis B, tracer BC vers le haut-droite. L'angle en B s'affiche en temps réel : "72° aigu"
3. L'enfant constate que c'est aigu, pas obtus. Il veut obtus. Il utilise l'outil Déplacer sur C et le repositionne jusqu'à ce que l'angle en B affiche >90° (ex : "110° obtus"). L'enfant vérifie visuellement et dans le panneau.
4. Depuis C, activer l'outil Parallèle, cliquer sur AB → un segment CD parallèle à AB est automatiquement placé, l'enfant ajuste la longueur.
5. Fermer la figure en reliant D à A.
6. Le panneau affiche : "1 paire de côtés parallèles (AB // CD)", angles listés avec classifications.

### 16.3 Tracer un triangle rectangle isocèle de cathètes 3 cm
1. Tracer un segment AB horizontal de 3 cm
2. Depuis A, l'outil détecte que le guide perpendiculaire est disponible → tirer vers le haut, le guide de perpendicularité apparaît → tracer AC de 3 cm vers le haut
3. Fermer en cliquant B → triangle fermé
4. Le panneau affiche : "Triangle rectangle isocèle", angle droit en A, cathètes de 3 cm, hypoténuse ~4,2 cm

### 16.4 Placer des points dans le plan cartésien
1. Activer le mode Plan cartésien (via un menu ou un bouton dédié)
2. Les axes x et y apparaissent avec graduation
3. L'enfant place des points en cliquant, le snap s'accroche aux coordonnées entières
4. Les coordonnées s'affichent près de chaque point : "(2, 3)"
5. L'enfant peut tracer des segments entre les points pour former une figure

---

## 17. Gestion des erreurs et cas limites

- **Segment de longueur 0** : si le deuxième clic est au même endroit que le premier, le segment n'est pas créé
- **Segments qui se croisent** : autorisés (pas de restriction). La figure peut être non convexe.
- **Plus de 26 points** : après Z, utiliser A', B', C'...
- **Figure trop grande pour le PDF** : afficher un avertissement "La figure dépasse la zone imprimable. Réduisez la taille ou changez l'orientation." Offrir un toggle paysage/portrait pour le PDF.
- **Navigateur non supporté** : afficher un message invitant à utiliser Chrome, Edge ou Firefox récent
- **Pas d'internet** : une fois chargée, l'app fonctionne hors ligne (service worker optionnel pour le futur)

---

## 18. Ce que l'outil NE fait PAS (hors scope explicite)

- Pas de mode exercice/évaluation (l'outil ne pose pas de questions, ne corrige pas)
- Pas de sauvegarde en ligne (pas de comptes, pas de login)
- Pas de collaboration temps réel
- Pas de reconnaissance de l'écriture manuscrite
- Pas de tutoriel intégré (mais un overlay de bienvenue au premier lancement expliquant les 3 outils principaux serait bienvenu)
- Pas de son ou audio
- Pas de développement de solides en 3D (version 1)
- Pas de transformations réflexion/translation (version 1 — à ajouter en v2)
- Pas de plan cartésien (version 1 — à ajouter en v2)

---

## 19. Priorités de développement (MVP → v2)

### MVP (version 1) — Le minimum pour être utile en classe
1. Canevas avec grille
2. Outil Segment avec snap aux points et à la grille
3. Outil Déplacer
4. Affichage temps réel des longueurs
5. Affichage temps réel des angles avec classification (aigu/droit/obtus)
6. Détection de parallélisme et perpendicularité (affichage dans le panneau)
7. Snap de parallélisme et perpendicularité (guides visuels pendant la construction)
8. Outil Mesurer/Fixer (fixer une longueur exacte)
9. Panneau latéral avec segments, angles, propriétés
10. Export PDF à l'échelle 1:1
11. Undo/Redo
12. Détection et nommage des figures fermées

### Version 2
- Outil Cercle
- Outils Perpendiculaire et Parallèle dédiés
- Transformations (réflexion, translation)
- Mode Plan cartésien
- Sauvegarde locale (localStorage) pour reprendre une construction
- Overlay de bienvenue / mini-tutoriel

### Version 3
- Développements de solides (3D → patron 2D)
- Import d'image de fond (scanner un exercice papier et construire par-dessus)
- Mode "gabarit rapide" pour les figures courantes (raccourci : carré de X cm)

---

## 20. Critères d'acceptation globaux

1. **Précision dimensionnelle** : un segment de 50mm à l'écran mesure 50mm ±0,5mm sur le PDF imprimé (sans mise à l'échelle d'impression)
2. **Performance** : le canevas reste fluide (60fps) avec jusqu'à 20 segments et 15 points
3. **Temps de construction** : un carré de 4 cm doit pouvoir être construit et imprimé en moins de 60 secondes par un utilisateur familier
4. **Accessibilité motrice** : aucune action ne nécessite une précision de clic inférieure à 15 pixels grâce au snap
5. **Langue** : interface entièrement en français (pas de termes anglais)
6. **Format numérique** : virgule décimale (pas de point), unité "cm" partout

---

## 21. Notes techniques pour l'implémentation

### 21.1 Gestion du DPI écran
Le canevas doit fonctionner indépendamment de la résolution de l'écran. Les coordonnées internes sont en mm. Le facteur de zoom écran (combien de pixels écran par mm interne) est calculé dynamiquement pour que la grille ait une taille confortable à l'écran (environ 25-30px par cm à zoom 100%). L'utilisateur peut zoomer/dézoomer le canevas avec la molette de la souris, mais les coordonnées internes ne changent pas.

### 21.2 Calcul d'angle entre deux segments
Utiliser `atan2` pour calculer la direction de chaque segment, puis la différence :
```typescript
function angleBetween(seg1: Segment, seg2: Segment, vertex: Point): number {
  const dx1 = otherEnd(seg1, vertex).x - vertex.x;
  const dy1 = otherEnd(seg1, vertex).y - vertex.y;
  const dx2 = otherEnd(seg2, vertex).x - vertex.x;
  const dy2 = otherEnd(seg2, vertex).y - vertex.y;
  const angle1 = Math.atan2(dy1, dx1);
  const angle2 = Math.atan2(dy2, dx2);
  let diff = angle2 - angle1;
  // Normaliser dans [0, 2π]
  if (diff < 0) diff += 2 * Math.PI;
  // Retourner le plus petit angle intérieur
  return Math.min(diff, 2 * Math.PI - diff) * (180 / Math.PI);
}
```

### 21.3 Détection de parallélisme pendant la construction
Pendant le drag d'un nouveau segment, pour chaque segment existant, calculer l'angle entre la direction du segment en construction et la direction du segment existant. Si |angle| < 5° ou |angle - 180°| < 5°, afficher le guide de parallélisme.

### 21.4 Formule de l'aire (Shoelace)
```typescript
function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;  // résultat en mm², convertir en cm² pour l'affichage
}
```

### 21.5 Export PDF
La stratégie recommandée :
1. Générer un SVG "propre" (N&B, sans grille sauf si demandée, sans fond coloré) à partir de l'état de la construction
2. Les dimensions du SVG sont en mm (viewBox en mm)
3. Utiliser jsPDF + svg2pdf.js pour injecter le SVG dans un PDF Lettre US
4. Positionner le SVG centré dans la zone imprimable, sans mise à l'échelle
5. Ajouter le segment-témoin de 5 cm en bas à droite
6. Ajouter la mention "TraceVite — Échelle 1:1" en bas à gauche en police 7pt grise
7. Déclencher le téléchargement ou l'ouverture du PDF dans un nouvel onglet

---

## Annexe A — Vocabulaire géométrique PFEQ à afficher

L'outil doit utiliser exactement le vocabulaire prescrit par le programme :

| Terme | Contexte d'utilisation |
|-------|----------------------|
| Segment | (pas "ligne" ni "côté" dans l'interface) |
| Sommet | (pas "point" quand il est partie d'une figure) |
| Côté | (dans le panneau, quand il est partie d'une figure fermée) |
| Angle aigu | Angle < 90° |
| Angle droit | Angle = 90° |
| Angle obtus | 90° < Angle < 180° |
| Est parallèle à (//) | Notation : AB // CD |
| Est perpendiculaire à (⊥) | Notation : AB ⊥ CD |
| Carré | 4 côtés égaux + 4 angles droits |
| Rectangle | 4 angles droits |
| Losange | 4 côtés égaux |
| Parallélogramme | 2 paires de côtés parallèles |
| Trapèze | 1 seule paire de côtés parallèles |
| Triangle équilatéral | 3 côtés égaux |
| Triangle isocèle | 2 côtés égaux |
| Triangle rectangle | 1 angle droit |
| Triangle scalène | Aucune propriété particulière |
| Périmètre | Somme des côtés |
| Aire | Surface intérieure |
| Rayon | Distance centre → cercle |
| Diamètre | 2 × rayon |
| Circonférence | Périmètre du cercle |

---

## Annexe B — Résumé exécutif pour l'enseignant

> TraceVite est un outil de construction géométrique numérique qui remplace la règle, le compas et le rapporteur pour les élèves ayant un TDC. L'élève construit ses figures à l'écran exactement comme il le ferait avec des instruments physiques, mais sans la barrière motrice. L'outil affiche automatiquement les mesures (longueurs, angles) et détecte les propriétés géométriques (parallélisme, perpendicularité, type d'angle). La figure construite est imprimée à l'échelle 1:1 : un segment de 5 cm à l'écran mesure 5 cm sur le papier. L'élève fait tout le raisonnement géométrique ; l'outil ne fait qu'exécuter le geste de traçage.
