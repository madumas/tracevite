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
- ~~Périmètre et aire~~ : **NON AFFICHÉS** — l'outil compense les gestes moteurs, pas les calculs. L'enfant voit les longueurs de chaque côté et calcule le périmètre et l'aire lui-même (voir §8.4)

### 3.3 Transformations
- Réflexion par rapport à un axe (2e cycle) — **priorité 1 (MVP)** car enseigné dès le 2e cycle
- Translation par flèche de translation (3e cycle) — priorité 2
- Production de frises et dallages — priorité 2

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
- Fonctionne dans un navigateur moderne : **Chrome/Edge 90+, Firefox 90+, Safari 15+**. Ces versions supportent toutes les API requises (PointerEvent, ResizeObserver, CSS `@page`, IndexedDB, Service Worker, Web Audio API). Chrome 90 date d'avril 2021 — même les Chromebooks avec mises à jour retardées sont au-delà. Afficher un message pour les navigateurs inférieurs.
- Aucune installation requise (l'enfant a déjà un ordinateur en classe)
- Responsive mais optimisé pour écran de laptop (1366x768 minimum). **Tester explicitement sur Chromebook 11.6"** (résolution 1366x768, densité ~135 dpi) — plusieurs commissions scolaires québécoises utilisent des Chromebooks. Le calcul des tolérances de snap en mm physiques dépend de la densité de pixels et doit être validé sur ces écrans.
- Pas de backend requis : tout est client-side
- Sauvegarde locale automatique via IndexedDB (pas de compte, pas de sauvegarde cloud). L'export PDF est la sortie principale.

### 4.1.1 Hébergement et accès
- Hébergement statique sur **Cloudflare Pages** — zéro maintenance serveur, scaling automatique, coût quasi nul. CDN mondial avec points de présence au Canada
- HTTPS obligatoire via Cloudflare (certificat TLS automatique, requis pour le Service Worker et pour les filtres de contenu des réseaux scolaires)
- Domaine : **`tracevite.ca`** — DNS et protection DDoS gérés par Cloudflare
- Aucun tracking, aucun analytics, aucune collecte de données — conformité avec la Loi 25 du Québec sur la protection des renseignements personnels. Mentionner cette garantie dans une page « Confidentialité » accessible depuis le footer

### 4.1.2 PWA et mode hors-ligne (MVP)
- Service Worker via `vite-plugin-pwa` (Workbox) — stratégie `CacheFirst` pour tous les assets statiques
- Fichier `manifest.json` pour rendre l'application installable (« Ajouter à l'écran d'accueil » dans Chrome/Edge). Donne un raccourci bureau, plein écran, sans barre d'URL — plus simple pour l'enfant
- **Pourquoi dans le MVP** : les laptops scolaires ont souvent un WiFi instable (bande passante partagée, portée limitée). Sans Service Worker, un refresh de page = écran blanc si le WiFi coupe
- **Mode dégradé (Service Worker bloqué)** : certains filtres de contenu scolaires (GoGuardian, Securly, ContentKeeper) ou politiques GPO peuvent bloquer l'installation du Service Worker. Si l'enregistrement du SW échoue, l'application fonctionne normalement en mode « online only » — aucune fonctionnalité n'est perdue sauf le cache hors-ligne et l'installabilité PWA. Ne jamais conditionner le fonctionnement de base à la présence du Service Worker. Afficher un avertissement discret dans les paramètres : « Mode hors-ligne non disponible (Service Worker non installé). »
- **Stratégie de mise à jour** : avec `CacheFirst`, l'utilisateur peut rester sur une ancienne version indéfiniment. Implémenter un prompt discret et non bloquant quand une nouvelle version est disponible : bandeau fin **au-dessus** de la barre d'actions (pas de chevauchement) « Une nouvelle version est disponible » avec bouton « Mettre à jour ». Le prompt ne doit jamais interrompre le travail en cours — l'enfant peut l'ignorer et mettre à jour plus tard. Le prompt apparaît une fois par nouvelle version de Service Worker; s'il est fermé, il réapparaît au prochain chargement de page. Cliquer « Mettre à jour » déclenche une **auto-sauvegarde** de la construction courante, puis recharge la page. Ajouter un numéro de version dans le format de données sauvegardé pour permettre la migration future si le schéma change.

### 4.2 Stack technique
- React 18+ avec TypeScript
- **SVG interactif** pour le canevas de construction. SVG est le choix retenu : les éléments SVG sont des éléments DOM standard avec événements natifs (pas de hit-detection maison), la conversion vers PDF vectoriel est directe, et les performances sont excellentes pour le nombre d'objets prévu (< 100 éléments). Konva.js et Fabric.js sont écartés — trop lourds (~150-300 Ko) pour ce cas d'usage, et ajoutent une dépendance de maintenance significative.
- jsPDF pour la génération PDF côté client. Le PDF est généré **programmatiquement** (lignes, cercles, texte) à partir des coordonnées internes en mm — pas de conversion SVG→PDF via svg2pdf.js, ce qui évite les bugs connus de cette librairie avec les polices et attributs SVG avancés. La conversion mm→unités PDF est triviale.
- `idb-keyval` (~600 octets gzippé) pour la persistance via IndexedDB (quota plus généreux que localStorage)
- `vite-plugin-pwa` pour le Service Worker (dev dependency)
- Pas de dépendance serveur
- **Événements pointeur** : utiliser l'API `PointerEvent` (pas `MouseEvent`) pour toutes les interactions sur le canevas. `PointerEvent` unifie souris, tactile et stylet — l'outil est ainsi compatible stylet (iPad + Apple Pencil, Chromebook avec écran tactile) dès le MVP sans travail supplémentaire. Les `PointerEvent` sont supportés par tous les navigateurs ciblés.
- **Principe de maintenance** : minimiser le nombre de dépendances. Moins de librairies = moins de failles de sécurité, moins de mises à jour breaking, plus facile pour un développeur solo ou bénévole.

### 4.3 Structure de fichiers suggérée
```
src/
  components/
    App.tsx                    # Layout principal
    Toolbar.tsx                # Barre d'outils (segment, point, cercle, réflexion, etc.)
    Canvas.tsx                 # Canevas de construction interactif
    PropertiesPanel.tsx        # Panneau latéral droit (mesures, propriétés)
    ContextActions.tsx         # Barre d'actions contextuelle (apparaît près de l'élément sélectionné)
    StatusBar.tsx              # Barre de statut contextuelle — indicateur de séquençage (outil actif + prochaine action)
    PrintDialog.tsx            # Dialogue d'instructions d'impression + déclenchement export PDF
    ModeSelector.tsx           # Sélecteur de mode d'affichage (Simplifié / Complet)
  engine/
    geometry.ts                # Calculs géométriques purs (distances, angles, intersections)
    snap.ts                    # Logique d'accrochage (grille, sommets, parallélisme, perpendicularité)
    properties.ts              # Détection automatique de propriétés (parallélisme, types d'angles, classification de figures)
    reflection.ts              # Calcul de réflexion par rapport à un axe
    pdf-export.ts              # Génération du PDF à l'échelle 1:1
  model/
    types.ts                   # Types : Point, Segment, Circle, AngleInfo, DetectedProperty, ConstructionState, ToolType
    state.ts                   # État global de la construction (liste de primitives, historique undo)
    persistence.ts             # Sauvegarde/restauration IndexedDB (via idb-keyval)
  hooks/
    useConstruction.ts         # Hook principal de gestion de la construction
    useSnap.ts                 # Hook d'accrochage
    useUndo.ts                 # Hook undo/redo
    useAutoSave.ts             # Hook de sauvegarde automatique en IndexedDB
  config/
    accessibility-constants.ts      # Constantes d'accessibilité (seuils, tolérances, timeouts) — estimations à ajuster après observation
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
  label?: string;     // "A", "B", "C"... attribué automatiquement (voir §5.3 pour la gestion des collisions d'étiquettes)
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
  classification: 'aigu' | 'droit' | 'obtus' | 'plat';
  // Note : en mode Simplifié, l'angle « plat » n'est pas affiché (hors programme 2e cycle)
  // « Rentrant » est retiré du MVP — entièrement hors programme au primaire
}

interface DetectedProperty {
  type: 'parallel' | 'perpendicular' | 'right_angle' | 'congruent_sides' | 'congruent_angles' | 'aligned_points';
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
  displayMode: 'simplifie' | 'complet';  // adapte l'affichage des mesures et outils disponibles
  displayUnit: 'cm' | 'mm';             // unité d'affichage (défaut : 'cm')
  consigne?: string;                     // instruction d'exercice de l'enseignant (max 1000 car., lecture seule pour l'élève, voir §8.0.1)
  history: HistoryEntry[];      // pour undo/redo
  historyIndex: number;
}

type ToolType =
  | 'segment'
  | 'point'
  | 'circle'
  | 'reflection'       // réflexion par rapport à un axe
  | 'perpendicular'   // tracer une perpendiculaire à un segment existant
  | 'parallel'         // tracer une parallèle à un segment existant
  | 'move'             // déplacer un point existant
  | 'measure';         // cliquer sur un segment pour fixer sa longueur
  // Note : la sélection n'est pas un outil dédié. Un clic sur un élément existant
  // (quand aucune action n'est en cours) le sélectionne dans n'importe quel outil.
  // Voir §6.9 pour le comportement de sélection transversal.
```

### 5.2 Unités internes

Toutes les coordonnées et mesures internes sont en millimètres. C'est l'unité de référence qui garantit la fidélité à l'impression 1:1.

### 5.3 Placement des étiquettes de points

Les étiquettes ("A", "B", "C"...) sont placées automatiquement à côté de chaque point. L'algorithme de placement doit éviter les superpositions :
- Position par défaut : en haut à droite du point (décalage +3mm, -3mm)
- Si cette position chevauche une autre étiquette ou un segment, tester les 7 autres positions (haut-gauche, bas-droite, bas-gauche, haut, bas, gauche, droite)
- Choisir la position qui minimise les chevauchements avec les éléments existants (segments, étiquettes, arcs d'angle)

Conversion affichage :
- Unité d'affichage configurable : cm (défaut) ou mm, via un toggle dans la barre supérieure
- Sur le canevas à l'écran : 1 mm interne = `(canvasPixelWidth / viewportWidthMm)` pixels
- Sur le PDF : 1 mm interne = 1 mm physique (c'est le point critique)
- Affichage utilisateur : dans l'unité sélectionnée, avec 1 décimale (ex : "4,5 cm" ou "45 mm"). Utiliser la virgule décimale, pas le point (contexte francophone).

---

## 6. Interaction détaillée — Mode libre (mode principal)

### 6.1 Outil Segment (outil par défaut)

**Machine à états de l'outil Segment :**

```
┌─────────┐  clic espace vide    ┌───────────────────┐  clic (vide ou point)  ┌────────────────────┐
│  IDLE   │ ───────────────────→ │ PREMIER_POINT_POSÉ │ ──────────────────────→ │ SEGMENT_CRÉÉ       │
└─────────┘                      └───────────────────┘                         │ (chaînage actif)    │
     │                                                                          └────────────────────┘
     │  clic sur point existant                                                        │
     │  (pas d'action en cours)                                                        │ clic sur point
     ↓                                                                                 │ existant → crée
┌──────────────────┐                                                                   │ segment vers ce
│ PREMIER_POINT_POSÉ│                                                                  │ point
│ (point existant   │                                                                  │
│  comme ancrage)   │                                                                  │ Escape, clic vide
└──────────────────┘                                                                   │ ou inactivité
     │ clic → crée segment                                                             ↓
     ↓                                                                               IDLE
   SEGMENT_CRÉÉ (chaînage)
```

**Règles de désambiguïsation des clics en mode Segment :**
- **IDLE + clic sur espace vide** → place le premier point (transition vers PREMIER_POINT_POSÉ)
- **IDLE + clic sur point existant** → utilise ce point comme premier point du segment (transition vers PREMIER_POINT_POSÉ). **Note de conception :** en mode Segment, l'intention de l'enfant est de tracer un segment, pas de déplacer un point. Le déplacement de points se fait via l'outil Déplacer dédié. Le curseur montre un réticule (pas une flèche de déplacement) au survol d'un point en mode Segment.
- **PREMIER_POINT_POSÉ + clic** → crée le segment (transition vers SEGMENT_CRÉÉ / chaînage)
- **SEGMENT_CRÉÉ (chaînage actif) + clic sur point existant** → crée un segment de l'ancre vers ce point (PAS de déplacement pendant le chaînage)
- **SEGMENT_CRÉÉ (chaînage actif) + clic sur espace vide** → crée un nouveau point et un segment de l'ancre vers ce point (continue le chaînage)
- **SEGMENT_CRÉÉ (chaînage actif) + Escape** → annule le chaînage (transition vers IDLE)
- **SEGMENT_CRÉÉ (chaînage actif) + inactivité** → annule le chaînage (transition vers IDLE). « Inactivité » = aucun déplacement de souris > 3mm physiques pendant la durée configurée. **Le timer se réinitialise à chaque mouvement > 3mm.** Les micro-tremblements < 3mm (fréquents chez les TDC) ne réinitialisent PAS le timer. Durée configurable dans les paramètres (voir ci-dessous).

**Créer un segment :**
1. L'utilisateur clique sur le canevas → un premier point est placé (snap à la grille si accrochage activé)
2. L'utilisateur déplace la souris → un segment fantôme (semi-transparent) s'étire en temps réel depuis le premier point
3. Pendant le déplacement :
   - La longueur du segment s'affiche en temps réel près du curseur (en cm, 1 décimale)
   - Si le segment s'approche d'une orientation parallèle à un segment existant (tolérance ±5°), un indicateur visuel apparaît (ligne-guide en pointillé vert + bulle "parallèle à AB")
   - Si le segment s'approche d'une orientation perpendiculaire à un segment existant (tolérance ±5°), même indicateur en pointillé vert + bulle "perpendiculaire à CD"
   - Si le curseur s'approche d'un point existant (tolérance : 7mm écran physique — voir §7.1), le point s'agrandit visuellement (snap magnétique) et le segment s'y connectera automatiquement
4. L'utilisateur clique une deuxième fois → le segment est créé
5. Si le deuxième clic est sur un point existant, le segment s'y connecte (les deux segments partagent ce point)
6. Après création, le nouveau point devient automatiquement le point de départ d'un potentiel segment suivant (chaînage). Le chaînage est rendu visuellement explicite :
   - Le point d'ancrage pulse doucement (animation subtile) pour indiquer qu'il est « prêt à continuer »
   - Le segment fantôme qui suit le curseur est plus transparent que pendant la création initiale (30% opacité au lieu de 60%)
   - La barre de statut affiche : « Continue depuis le sommet B. Clique ailleurs ou appuie Échap pour terminer. »
   - Un clic sur un espace vide ou Escape annule le chaînage
   - Le chaînage se termine automatiquement après un délai d'inactivité (pas de mouvement de souris significatif). **Durée configurable** dans les paramètres : 5s / 8s / 15s / désactivé. **Défaut : 8 secondes.** (5s est trop court pour de nombreux enfants TDC — le processus regarder → planifier → localiser → déplacer → cliquer implique des transferts intermodaux qui prennent plus de temps). L'undo (Ctrl+Z) reste disponible en cas d'erreur.
7. Après création d'un segment, un champ de saisie de longueur apparaît **après un délai de 300ms** dans une **position fixe et prévisible**. Ce délai évite un flash visuel si l'enfant clique immédiatement pour continuer la chaîne. Si un clic survient pendant le délai, le champ n'apparaît pas. Au-delà de 300ms, le champ apparaît en fondu (150ms fade-in). Si le chaînage produit un nouveau segment pendant que le champ du précédent est visible, le champ se met à jour pour le nouveau segment (pas deux champs simultanés). Position du champ : centré horizontalement en bas du canevas, au-dessus de la barre d'actions (pré-rempli avec la longueur actuelle, libellé « Longueur du segment AB : » + placeholder « Tape une longueur ou clique ailleurs ». Le placeholder clarifie que le champ **attend optionnellement une action** — sans lui, l'enfant ne sait pas s'il doit taper quelque chose ou si c'est juste un affichage (test utilisateur confirmé)). Le champ utilise l'attribut `inputmode="decimal"` pour afficher le **pavé numérique** sur les appareils tactiles (plus petit que le clavier complet, et plus adapté à la saisie de mesures). **Sur tablette** : quand le clavier virtuel est détecté (heuristique : `visualViewport.height` diminue de >30%), le champ est repositionné dans la **partie supérieure** du canevas (au lieu du bas) pour éviter d'être masqué par le clavier. Le champ reste visible tant que l'enfant n'a pas tapé une valeur + Entrée, cliqué ailleurs, ou appuyé sur Escape. **Pas de timeout automatique** — l'enfant contrôle quand le champ disparaît. **Note de conception :** un emplacement fixe est préférable à « près du segment » car le passage attention visuelle → localisation du champ → déplacement du curseur → saisie clavier est une séquence très exigeante pour un enfant TDC. Un emplacement prévisible réduit la charge de recherche visuelle.

**Coexistence du champ de longueur et du chaînage :**
- Le champ de longueur ne prend **pas** le focus automatiquement — le canevas reste l'interaction principale. L'enfant doit cliquer dans le champ pour y taper.
- Un clic sur le canevas pour continuer le chaînage **ferme automatiquement** le champ de longueur (la valeur affichée est conservée sans modification).
- Si l'enfant clique dans le champ et commence à taper, le timer d'inactivité de chaînage est **suspendu** tant que le champ a le focus.
- **Le timer est aussi suspendu quand le curseur quitte le canevas** (entre dans le panneau latéral, la toolbar, la barre de statut). La consultation du panneau pour vérifier une mesure est une action intentionnelle liée à la construction en cours. Le timer reprend quand le curseur revient sur le canevas.
- Valider le champ (Entrée) ne termine pas le chaînage — le chaînage reste actif si le timer n'a pas expiré.
- La valeur saisie dans le champ est interprétée dans l'unité d'affichage active (cm ou mm).

**Déplacement direct de points retiré du mode Segment :**
- ~~En mode Segment, un clic sur un point existant permettait de le déplacer.~~ Ce comportement a été retiré suite à une révision d'accessibilité : en mode Segment, l'intention de l'enfant est de tracer des segments, pas de déplacer des points. L'ambiguïté clic-sur-point = déplacement vs. début-de-segment était source de confusion pour les enfants TDC.
- **Le déplacement de points se fait exclusivement via l'outil Déplacer** (§6.7, mode pick-up/put-down) ou via le **clic-glissé classique** (press-hold-move-release) sur un point dans n'importe quel outil, y compris Segment. **Disambiguation en mode Segment** : un clic sur un point (mouvement < 1,5mm depuis le pointerdown) = début d'un segment depuis ce point. Un drag sur un point (mouvement > 1,5mm) = déplacement du point. Le seuil de drag (§13.4) est le discriminant. Le mode pick-up/put-down (clic sans maintien) est retiré de Segment car il entre en conflit avec la création de segments.

**Connecter pour fermer une figure :**
- Si le dernier point d'un segment se connecte au premier point de la chaîne, la figure est fermée
- Une figure fermée déclenche la classification automatique (triangle, carré, etc.)

### 6.2 Outil Point
- Clic simple → place un point libre sur le canevas
- Utilisé pour marquer des points de repère avant de tracer des segments
- **Masqué par défaut** dans la toolbar (l'outil Segment crée déjà des points). Disponible via les paramètres. Réduire le nombre d'outils visibles diminue la surcharge cognitive pour l'enfant TDC.

### 6.3 Outil Cercle
**Mode deux-clics (par défaut, adapté TDC) :**
1. Clic pour placer le centre
2. Déplacement de la souris (sans bouton enfoncé) → le cercle fantôme s'agrandit en temps réel, le rayon s'affiche
3. Clic pour confirmer le rayon. **Les snaps s'appliquent au 2e clic** (grille, points existants) — le rayon est la distance centre → position snappée. Avec la grille de 1cm, les rayons sont effectivement quantifiés (~5mm près), ce qui aide à créer des cercles avec des mesures rondes.
4. Possibilité de fixer le rayon à une valeur exacte via le panneau latéral ou le champ de saisie rapide (pour les valeurs non-grille). Le champ utilise `inputmode="decimal"` (pavé numérique sur tablette). Même logique de repositionnement que le champ de longueur du segment (§6.1) quand le clavier virtuel est détecté.

**Mode drag (alternatif) :** Clic-glissé depuis le centre pour définir le rayon, relâcher pour confirmer. Disponible en parallèle pour les enfants qui maîtrisent le clic-glissé.

**Toggle rayon / diamètre :** Le champ de saisie rapide du cercle affiche un toggle « Rayon / Diamètre » permettant à l'enfant de spécifier la dimension souhaitée. Au 3e cycle, les exercices demandent souvent « trace un cercle de diamètre 6 cm » — l'enfant ne devrait pas avoir à diviser mentalement par 2.

**Angle au centre :** Au 3e cycle, les exercices impliquent des angles au centre. Pour créer un angle au centre, l'enfant trace deux rayons (segments du centre vers le cercle) ; l'angle entre ces rayons est affiché automatiquement comme tout autre angle entre deux segments connectés. La barre de statut affiche « Clique sur le cercle pour tracer un rayon » quand l'outil Segment est actif et qu'un cercle est présent.

**Note de conception :** Le maintien de pression sur le bouton de la souris pendant un déplacement est l'un des gestes les plus difficiles pour un enfant TDC. Le mode deux-clics est donc le mode par défaut.

**Interactions avec les cercles (compléments) :**
- **Sélection** : un clic sur le trait du cercle le sélectionne (surbrillance bleue). Barre d'actions contextuelle : Supprimer, Fixer rayon/diamètre.
- **Déplacement** : déplacer le point centre (via l'outil Déplacer ou le clic-glissé sur le point centre dans n'importe quel outil) déplace le cercle entier. Le rayon est conservé.
- **Snap à la circonférence** : un nouveau type de snap (**priorité 2b** — après le snap au milieu de segment qui est 2a, tolérance 5mm écran physique) est actif quand l'outil Segment est utilisé. Le milieu d'un segment est un point discret (géométriquement plus précis) et prime sur la circonférence (continuum de points). À priorité égale, le plus proche en distance gagne. Un point placé près de la circonférence est snappé exactement sur celle-ci. Feedback visuel : le trait du cercle s'épaissit localement + étiquette « sur le cercle ». Ce snap permet de tracer des rayons et des cordes avec précision.
- **Intersections segment-segment** : quand un nouveau segment croise un segment existant, un point d'intersection est automatiquement créé et les deux segments sont scindés en sous-segments (auto-intersection, activée par défaut, désactivable dans les Paramètres). Cela compense le geste de précision TDC — l'enfant fait le raisonnement (« je trace une droite à travers cette figure »), l'outil crée les sommets d'intersection. Les intersections segment-cercle et cercle-cercle ne sont **pas** automatiquement créées ; l'enfant place un point manuellement et le snap à la circonférence l'aide à le positionner.
- **Réflexion** : un cercle peut être réfléchi. Le centre est réfléchi par rapport à l'axe; le rayon est conservé.
- **Panneau latéral** : un cercle sélectionné affiche dans le panneau : centre (ex. « Centre A »), rayon, diamètre. **Note :** la formule de la circonférence (C = 2πr) relève du secondaire 1. Au primaire, le mot « circonférence » est introduit au 3e cycle mais sans la formule π. TraceVite n'affiche donc **pas** la valeur calculée de la circonférence.
- **Visibilité par niveau** : en mode 2e cycle, le bouton Cercle est **masqué** dans la toolbar (pas présent du tout, pas désactivé grisé). Tout cercle existant dans une construction reste visible si le niveau est changé après coup. **Les actions contextuelles (sélectionner, supprimer, fixer rayon) restent disponibles** sur les cercles existants en mode 2e cycle — seule la création de nouveaux cercles est interdite. Principe : ne jamais rendre une construction inutilisable par un changement de paramètre.

### 6.4 Outil Perpendiculaire
1. L'utilisateur clique sur un segment existant (il se met en surbrillance)
2. L'utilisateur clique sur un point par lequel la perpendiculaire doit passer (point existant ou nouveau point sur le segment)
3. L'outil trace automatiquement un segment perpendiculaire. L'utilisateur définit la longueur en étirant.

### 6.5 Outil Parallèle
1. L'utilisateur clique sur un segment existant (il se met en surbrillance)
2. L'utilisateur clique à l'endroit où la parallèle doit passer
3. L'outil trace automatiquement un segment parallèle de même longueur. L'utilisateur peut ajuster la longueur.

### 6.6 Outil Réflexion (axe de symétrie)

**Machine à états :**

```
┌─────────┐  clic sur segment existant    ┌──────────────┐  clic sur segment/figure  ┌──────────┐
│ CHOISIR │ ────────────────────────────→  │ AXE_DÉFINI   │ ────────────────────────→  │ TERMINÉ  │ → IDLE
│ AXE     │                                └──────────────┘                            └──────────┘
└─────────┘
     │ clic sur espace vide (1er point)
     ↓
┌─────────────────┐  clic (2e point)  ┌──────────────┐
│ AXE_EN_COURS    │ ────────────────→ │ AXE_DÉFINI   │
└─────────────────┘                   └──────────────┘
```

**Étape 1 — Définir l'axe :**
- **Clic sur un segment existant** → ce segment devient l'axe (surbrillance rouge + pointillé). Transition directe vers AXE_DÉFINI.
- **Clic sur un espace vide ou un point isolé** → place le premier point de l'axe. Un deuxième clic place le second point et crée l'axe. L'axe est un élément visuel temporaire (pointillé rouge), pas un segment de la construction.
- **Désambiguïsation** : si le premier clic tombe sur un point qui est l'extrémité d'un segment, c'est interprété comme le début d'un nouvel axe (pas comme sélection du segment). Pour sélectionner un segment existant comme axe, cliquer sur le corps du segment (pas sur ses extrémités).
- Barre de statut : « **Réflexion** — Clique sur un segment pour le choisir comme axe, ou clique deux points pour tracer l'axe »

**Étape 2 — Sélectionner les éléments à refléter :**
- **Clic sur un segment** faisant partie d'une figure fermée → toute la figure est sélectionnée et réfléchie. **Si le segment est partagé par deux figures** (ex. diagonale commune), la **plus petite figure** (minimum de côtés; si égalité, plus petite aire; si encore égalité, celle dont le centroïde est le plus proche du point de clic) est sélectionnée. Pas de dialogue de choix (trop complexe pour un TDC). Pour refléter la plus grande figure, l'enfant clique sur un segment non-partagé de celle-ci.
- **Clic sur un segment libre** (pas dans une figure fermée) → seul ce segment est réfléchi.
- **Clic sur un cercle** → le cercle est réfléchi (centre et rayon).
- Pour le MVP, la sélection est unitaire (un élément ou une figure fermée par opération). L'utilisateur peut répéter l'opération pour refléter d'autres éléments par rapport au même axe.
- Barre de statut : « **Réflexion** — Clique sur une figure ou un segment pour le refléter. Clique ailleurs ou appuie Échap pour terminer. »

**Étape 3 — Résultat :**
- Les éléments réfléchis sont des **copies indépendantes** (points et segments distincts). Ils ne sont pas liés à l'original — modifier l'original ne modifie pas la copie.
- **Étiquetage des copies** : les points réfléchis utilisent la **notation prime** — si l'original est A, B, C, la copie est A', B', C'. C'est la notation mathématique standard pour les transformations et elle est pédagogiquement essentielle : la correspondance point-image est au cœur de l'apprentissage de la réflexion (PFEQ). Si A' existe déjà, utiliser A'', etc. Ne pas utiliser les lettres séquentielles (D, E, F) car cela briserait le lien conceptuel original-image.
- L'axe reste visible (pointillé rouge) tant que l'outil Réflexion est actif. Il disparaît quand l'utilisateur change d'outil ou appuie sur Escape.
- **Feedback après réflexion** : la barre de statut affiche un message explicite, par ex. « Triangle ABC réfléchi → A'B'C'. Pour refléter le carré, clique sur un autre côté. » Ce message guide l'enfant qui sélectionne un segment partagé et ne comprend pas pourquoi la « mauvaise » figure est réfléchie.
- L'ensemble de l'opération (axe + copie réfléchie) constitue **une seule étape** dans l'historique undo.

**Contraintes d'axe par niveau :**
- **Mode Simplifié** : l'axe est contraint aux orientations verticale, horizontale ou diagonale à 45° (la PDA évalue la réflexion avec axe oblique dès la 4e année — ex. : axe de symétrie d'un losange). Si l'axe tracé ne correspond pas à l'une de ces orientations, il est **snappé automatiquement** à l'orientation permise la plus proche.
- **Mode Complet** : l'axe peut être dans n'importe quelle orientation.

### 6.7 Outil Déplacer
**Mode pick-up / put-down (par défaut, adapté TDC) :**
- Clic sur un point → le point est « ramassé » (visuellement agrandi, couleur d'accentuation, curseur change)
- Déplacement de la souris (sans bouton enfoncé) → le point suit le curseur
- Clic pour « déposer » le point à son nouvel emplacement. **Le point n'est pas sélectionné après le dépôt** — afficher un bouton Supprimer immédiatement après un geste de placement est dangereux pour un enfant TDC (clic accidentel). Pour supprimer ou verrouiller un point en mode Déplacer, utiliser le **panneau Propriétés** (clic sur « Sommet A » → sélection → barre d'actions contextuelle). Voir §6.9.
- Escape pour annuler le déplacement et remettre le point à sa position initiale

**Mode drag (alternatif) :** Clic-glissé classique disponible en parallèle.

**Clic sur le fond vide (aucun point sous le curseur) :** si aucun point n'est ramassé, rien ne se passe — la barre de statut continue d'afficher « Clique sur un point pour le ramasser » (pas de message d'erreur, principe TDC). Si un point est ramassé, un clic sur le fond dépose le point à cet emplacement (comportement normal du put-down).

- **Les segments connectés au point se redessinent en temps réel** pendant le déplacement (< 16ms / 1 frame à 60fps entre le mouvement du curseur et la mise à jour visuelle complète). Toutes les mesures (longueurs, angles) se mettent à jour en temps réel. **Ce feedback visuel continu est non-négociable** : un enfant TDC qui voit un délai entre le mouvement du point et la mise à jour du segment perd sa boucle de rétroaction visuelle et ne peut plus ajuster son geste.
- Les propriétés détectées (parallélisme, etc.) se mettent à jour en temps réel
- Si un point est snappé à la grille, le déplacement reste snappé

**Résolution de contraintes lors du déplacement :**
- **Point verrouillé (`locked: true`)** : le point ne peut pas être ramassé. Le curseur reste normal au survol (pas de flèche de déplacement). Le verrouillage se fait via la barre d'actions contextuelle; le déverrouillage aussi.
- **Segment avec `fixedLength`** : quand un point connecté à un segment de longueur fixe est déplacé, le **segment pivote autour du point déplacé** en maintenant sa longueur. L'autre extrémité est repositionnée à `pointDéplacé + unitVector(pointDéplacé → autreExtrémité) × fixedLength`. Le segment change de direction mais pas de longueur. Si l'autre extrémité est verrouillée, le déplacement du point est contraint à un cercle de rayon `fixedLength` centré sur le point verrouillé.
- **Segment verrouillé en parallèle (§7.3)** : quand un point d'un segment verrouillé parallèle est déplacé, le segment maintient son orientation parallèle. Le point se déplace librement, et l'autre extrémité s'ajuste pour conserver la direction. Si un conflit rend les contraintes impossibles à satisfaire simultanément (ex. : fixedLength + parallèle + point verrouillé), la contrainte dont le **timestamp d'application** (verrouillage) est le plus récent est **relâchée** (c'est le timestamp du verrouillage/fixation explicite, pas de la création du segment — l'action la plus récente de l'utilisateur est la plus « fragile ») avec un avertissement visuel (flash orange sur le segment dont la contrainte a cédé) et un message dans la barre de statut : « La contrainte de parallélisme a été relâchée. Annuler (Ctrl+Z) pour revenir. » Le flash orange est un **flash unique de 500ms** (fade-in 100ms, maintien 300ms, fade-out 100ms). Le message de la barre de statut reste affiché **pendant tout le déplacement** (tant que le point est ramassé), puis disparaît au put-down. Ne PAS bloquer le déplacement avec un message modal — un enfant TDC qui est bloqué perd le fil de sa tâche.
- **Propagation des contraintes** : la résolution s'arrête après **un seul niveau**. Si l'extrémité déplacée par la résolution d'un `fixedLength` est elle-même liée à un autre segment `fixedLength`, cette deuxième contrainte est **relâchée** (flash orange). Un système de contraintes en chaîne dépasserait le scope d'un outil primaire et serait imprévisible pour l'enfant.
- Ces mises à jour se font en temps réel pendant le déplacement.

### 6.8 Outil Longueur
- Clic sur un segment → le champ "longueur" dans le panneau latéral devient éditable
- L'utilisateur tape une valeur exacte (ex : "5") → le segment s'ajuste automatiquement à cette longueur dans l'unité d'affichage active (cm ou mm)
- Le point le plus récemment créé (timestamp de création le plus élevé) se déplace pour respecter la longueur fixée, le long de la direction actuelle du segment (l'autre extrémité reste ancrée). Si ce point est verrouillé, c'est l'autre extrémité qui se déplace.
- Fixer une longueur est une étape distincte dans l'historique undo (séparée de la création du segment).

### 6.9 Sélection et suppression

**La sélection est un comportement transversal**, disponible dans tous les outils (pas un outil dédié). Un clic sur un élément existant le sélectionne **quand aucune action n'est en cours** dans l'outil actif. Plus précisément :
- **En mode Segment** : un clic sur un segment (pas un point) le sélectionne si l'outil est à l'état IDLE (pas de premier point posé, pas de chaînage actif). Un clic sur un point en IDLE commence un nouveau segment depuis ce point (§6.1), pas la sélection. **Pendant le chaînage**, aucune sélection n'est possible — tout clic est interprété comme continuation de la chaîne. Les **règles de snap normales** s'appliquent au clic (points existants > milieu de segment > grille > angle > alignement). Il n'y a pas de snap spécial « projection sur segment » — un clic près d'un segment snap au milieu si dans la tolérance 2a, sinon à la grille, sinon à la position du clic. L'enfant qui veut vérifier une mesure pendant le chaînage peut consulter le panneau latéral (toujours visible) sans interrompre le chaînage.
- **En mode Cercle** : un clic sur un cercle existant le sélectionne si l'outil est à l'état IDLE (pas de centre posé).
- **En mode Déplacer** : un clic sur un élément (point, segment, cercle) le sélectionne ET initie le déplacement pour les points. Pour sélectionner un segment ou cercle sans action, cliquer dessus.
- **En mode Longueur** : un clic sur un segment le sélectionne ET ouvre le champ de longueur.
- **En mode Réflexion** : la sélection est gérée par le workflow de l'outil (§6.6).

**Barre d'actions contextuelle :**
- Position : centrée au-dessus de l'élément sélectionné, avec un décalage de 8px. Si cette position dépasse le haut du canevas, la barre passe en dessous de l'élément. Si elle dépasse les bords latéraux, elle est poussée vers l'intérieur.
- Pour un segment : la barre est centrée au milieu du segment.
- Pour un point partagé par plusieurs segments : le clic sélectionne le **point** (pas un segment). Les actions contextuelles sont celles du point.
- **Boutons par type d'élément** (le bouton Supprimer inclut le **nom de l'élément ciblé** pour rassurer l'enfant anxieux — « Supprimer » seul fait peur sans contexte) :
  - Point : « Supprimer le point A », Verrouiller/Déverrouiller
  - Segment : « Supprimer le côté AB » / « Supprimer le segment AB », Fixer longueur
  - Cercle : « Supprimer le cercle », Fixer rayon/diamètre
- Tous les boutons : 44×44px minimum.
- Un seul élément est sélectionné à la fois. Cliquer sur un autre élément remplace la sélection (pas de multi-sélection dans le MVP).
- Les mêmes actions sont aussi disponibles dans le panneau latéral droit (section contextuelle)

**Suppression :**
- **Bouton 🗑 Supprimer dans la barre d'actions** (en bas, à côté de Annuler/Rétablir). Fonctionne en **mode toggle** :
  1. Clic sur 🗑 → entre en **mode suppression** (bouton fond rouge, curseur crosshair sur le canvas, barre de statut : « Supprimer — Clique sur un élément pour le supprimer »).
  2. Clic sur un élément (point, segment, cercle) → l'élément est sélectionné (surbrillance) et la barre de statut affiche « Supprimer le point A? Clique à nouveau pour confirmer. » (micro-confirmation).
  3. Clic à nouveau sur le même élément → suppression confirmée. Le mode suppression reste actif pour enchaîner les suppressions.
  4. Clic sur un autre élément → change la cible (retour à l'étape 2).
  5. Clic sur 🗑 à nouveau ou Escape → quitte le mode suppression.
  Ce mode est le chemin principal de suppression — il est toujours visible et accessible quel que soit l'outil actif. Essentiel pour supprimer des points en mode Déplacer ou Segment, où un clic sur un point déclenche l'outil plutôt que la sélection.
- **Micro-confirmation** (même pattern sur le bouton de la barre d'actions et sur celui de la barre contextuelle) : un premier clic change le bouton en état « Confirmer? » (fond rouge, texte blanc) pendant 3 secondes, puis revient à « Supprimer ». Un deuxième clic pendant le délai confirme la suppression. **Escape pendant l'état « Confirmer? »** annule la confirmation (ramène le bouton à « Supprimer ») sans monter dans la hiérarchie Escape — il résout l'état intermédiaire le plus local. Le prochain Escape suit la hiérarchie normale. Cela protège du clic accidentel (fréquent chez les TDC) sans la lourdeur d'un dialogue modal.
- Touche Delete/Backspace sur un élément sélectionné → suppression directe (pas de micro-confirmation — le geste clavier est plus intentionnel qu'un clic errant). L'undo reste disponible dans tous les cas.
- Supprimer un point supprime aussi tous les segments connectés à ce point
- Supprimer un segment ne supprime **pas** ses points d'extrémité (ils deviennent des points libres)
- Supprimer un cercle ne supprime **pas** les segments qui passaient par son centre ou sa circonférence
- Si la suppression casse une figure fermée, le vocabulaire (Côté→Segment, Sommet→Point) est mis à jour immédiatement (§9.0)
- **Pas de clic droit** : le clic droit n'est pas utilisé dans l'application (geste difficile pour un enfant TDC)

---

## 7. Système d'accrochage (snap)

Le snap est activé par défaut. Bouton toggle dans la toolbar. La taille de grille est sauvegardée **par construction** (pas globalement). **Une nouvelle construction démarre toujours avec une grille de 1cm** (valeur par défaut prévisible — la dernière taille utilisée n'est pas héritée). Changer la taille de grille ne déplace pas les points existants — un point placé sur une intersection 1cm reste à sa position même si la grille passe à 5mm. La grille peut être masquée indépendamment du snap via un toggle distinct (la grille est visuelle, le snap est fonctionnel). **Quand `snapEnabled: false`**, TOUS les types de snap sont désactivés (grille, points existants, milieu, angle, alignement, circumférence). La grille reste visible par défaut (repère visuel même sans snap). Les 4 combinaisons grille visible/masquée × snap on/off sont valides.

### 7.1 Types d'accrochage (par priorité)

**Note sur les tolérances** : les tolérances ci-dessous sont exprimées en millimètres physiques à l'écran. **Conversion en pixels** : utiliser l'heuristique `pixelsMm = devicePixelRatio × 96 / 25.4` (basée sur une densité supposée de 96dpi). Les navigateurs n'exposent pas les DPI physiques réels — cette approximation est acceptable (±20% sur certains écrans), compensée par la générosité des tolérances et les profils ×1.5 / ×2.0. Pas de calibrage utilisateur (trop complexe pour un enfant de 8 ans).

**Tolérances configurables :** Les tolérances par défaut ci-dessous conviennent à la majorité des élèves. Deux profils sont disponibles dans les paramètres :
- **« Tolérance large »** (multiplicateur ×1.5 sur toutes les tolérances de distance) pour les enfants dont la précision motrice est inférieure à 10mm — fréquent chez les TDC de 8-9 ans.
- **« Tolérance très large »** (multiplicateur ×2.0) pour les enfants dont la précision de pointage est très faible (15-20mm et plus).
L'enseignant ou le professionnel accompagnateur (ergothérapeute, etc.) active le profil au besoin. Le profil de tolérance est **global** (sauvegardé dans les préférences, pas par construction) — il correspond au profil moteur de l'enfant, pas à la construction. La tolérance d'angle (±5°) et le seuil de drag (1,5mm) ne sont pas affectés par le multiplicateur (le seuil de drag est un seuil de détection d'intention, pas de précision motrice).

**Résolution de priorité** : quand plusieurs snaps sont dans leur zone de tolérance simultanément, la priorité numérique la plus basse gagne (1 bat 2, etc.). À priorité égale, le snap le plus proche en distance gagne. Les snaps de position (1-3, 5) et les snaps de direction (4) opèrent sur des dimensions différentes et peuvent être actifs simultanément (ex. : snap à un point existant + guide d'angle).

1. **Snap aux points existants** (priorité 1, tolérance : 7mm écran physique)
   - Quand le curseur approche d'un point existant, le curseur "saute" dessus
   - Feedback visuel : le point cible s'agrandit et un cercle de halo apparaît

2. **Snap au milieu d'un segment** (priorité 2a, tolérance : 5mm écran physique). Prime sur le snap à la circonférence (2b) car c'est un point discret.
   - Quand le curseur approche du milieu d'un segment existant, un point-repère apparaît au milieu
   - Feedback visuel : petit losange vert au milieu du segment + étiquette « milieu »
   - Compétence PFEQ fréquemment évaluée (médianes, diagonales, construction de losanges)

3. **Snap à la grille** (priorité 3, tolérance : 5mm écran physique)
   - La grille est de 1 cm par défaut (modifiable : 5 mm ou 2 cm). L'option 5 mm est utile dès le 2e cycle pour correspondre au papier quadrillé 5 mm utilisé en classe.
   - Le point se place à l'intersection de grille la plus proche
   - Feedback visuel : petit point vert à l'intersection cible

4. **Snap d'angle** (priorité 4 — snap de direction, tolérance : ±5° de l'angle cible)
   - Quand un segment en cours de création s'approche de 0°, 30°, 45°, 60°, 90°, 120°, 135°, 150°, 180° par rapport à l'horizontale : guide en pointillé
   - Quand le segment s'approche d'être parallèle ou perpendiculaire à un segment existant : guide en pointillé + étiquette
   - Feedback visuel : ligne-guide verte en pointillé + bulle d'information

5. **Snap d'alignement** (priorité 5, tolérance : 2mm écran physique)
   - Si le curseur s'aligne verticalement ou horizontalement avec un point existant : guide en pointillé gris

### 7.2 Feedback sonore (optionnel)
Désactivé par défaut, activable via un sélecteur « Sons » dans les paramètres. **Trois modes** : Off (défaut) / Réduits (création de segment + fermeture de figure uniquement, pas de snap — pour les enfants avec hypersensibilité auditive comorbide) / Complets (les 3 sons). **Implémentation via Web Audio API (synthèse)** — pas de fichiers audio à charger ou cacher, aligné avec le principe « minimiser les dépendances ». **Politique autoplay** : le `AudioContext` est créé au moment du clic sur le toggle « Sons » — ce clic satisfait la politique anti-autoplay des navigateurs. Si le contexte est suspendu ultérieurement, appeler `audioContext.resume()` au prochain clic canevas. Gain ajustable via un slider dans les paramètres (quand les sons sont activés). **Gain par défaut : 50%** — le premier son entendu après activation ne doit pas surprendre un enfant avec hypersensibilité auditive. Trois micro-sons distincts (~50ms chacun) :
- **Snap** : bruit blanc filtré passe-bas, 50ms (clic discret quand un point accroche sur la grille, un point existant, un milieu de segment ou un guide d'angle)
- **Création de segment** : sinusoïde 880Hz, 50ms avec decay rapide (son de confirmation bref quand un segment est créé avec succès)
- **Fermeture de figure** : deux sinusoïdes simultanées 440Hz + 660Hz, 80ms avec decay (accord de deux notes, légèrement plus riche, quand une figure est fermée)

**Note de conception :** Le TDC est souvent associé à des difficultés de rétroaction proprioceptive (réf. : littérature sur le TDC) — l'enfant n'est pas sûr que son action a « pris ». Ce feedback sensoriel complémente le feedback visuel et confirme que l'action a été complétée.

**Debounce des sons** : le son de snap joue uniquement à l'**entrée** dans une zone de snap (pas à chaque frame en restant dedans). Intervalle minimum de **150ms** entre deux sons de snap, indépendamment du type (grille → point → milieu : même debounce). Sortie + re-entrée dans la même zone en <150ms : pas de son. Prévient la surcharge auditive. Les sons de création de segment et de fermeture de figure ne sont PAS debounced (événements ponctuels).

**Retour haptique (v2) :** Sur les appareils qui supportent l'API Vibration (tablettes, certains laptops), déclencher une micro-vibration (~30ms) sur les événements de snap et de création de segment. Complémente le feedback sonore pour la rétroaction proprioceptive, particulièrement utile avec un stylet sur tablette.

### 7.3 Verrouillage
- Quand un snap d'angle est actif (parallèle, perpendiculaire, angle rond), l'utilisateur peut cliquer pour verrouiller la contrainte
- Un segment verrouillé en parallèle reste parallèle même si on déplace ses points
- Feedback visuel : petite icône de cadenas sur le segment verrouillé

---

## 8. Feedback visuel en temps réel

### 8.0 Sélecteur de mode d'affichage

Un sélecteur dans l'en-tête permet de choisir le mode d'affichage : **Simplifié** (par défaut) ou **Complet**. Les libellés sont non-jugementaux — ils décrivent l'interface, pas le niveau de l'enfant. Ce choix adapte l'affichage des mesures et les outils disponibles :

| Aspect | Simplifié | Complet |
|--------|-----------|---------|
| Angles | Classification seulement (aigu/droit/obtus) + carré pour angle droit | Classification + mesure en degrés |
| Cercle | Non disponible | Disponible |
| Plan cartésien | Non disponible | Disponible (v2) |
| Réflexion | Disponible (axe vertical/horizontal/diagonal 45°) | Disponible (axe quelconque) |
| Classification triangles | Une seule (la plus spécifique) | Cumulative (ex. « rectangle isocèle ») |
| Seuil surcharge visuelle | 5 segments | 6 segments |

Le mode par défaut est Simplifié. L'enseignant ou l'enfant peut changer à tout moment.

**Aide contextuelle pour les parents (usage à la maison) :** le sélecteur utilise un menu déroulant personnalisé (pas un `<select>` natif) avec deux lignes par option :

- **État fermé (affiché dans le header)** : texte compact — « Simplifié » ou « Complet ».

- **État ouvert (dropdown déplié)** : chaque option affiche :
  - Ligne principale (14px, gras) : « Simplifié » / « Complet »
  - Ligne secondaire (12px, gris, non gras) : « Affichage essentiel (correspond au 2e cycle) » / « Toutes les mesures et outils (correspond au 3e cycle) »
  - Hauteur de chaque option : minimum 44px (cible de clic conforme TDC)

Exemple visuel du dropdown ouvert :
```
┌────────────────────────────────────────────────────┐
│  Simplifié                                    ✓   │
│  Affichage essentiel (correspond au 2e cycle)      │
├────────────────────────────────────────────────────┤
│  Complet                                           │
│  Toutes les mesures et outils (correspond au 3e cycle) │
└────────────────────────────────────────────────────┘
```

**Note de conception :** un menu déroulant personnalisé (plutôt qu'un `<select>` natif) est nécessaire pour afficher les deux lignes par option. Il doit respecter les attributs `role="listbox"` / `role="option"` et `aria-selected` pour l'accessibilité. Le dropdown se ferme au clic en dehors (comportement standard). Le texte secondaire (référence au cycle) est une information professionnelle pour l'enseignant ou le parent — il fait le lien avec le programme scolaire sans étiqueter l'enfant.

### 8.0.1 Consigne d'exercice (support devoirs à la maison)

**Contexte :** quand l'enseignant prépare un exercice à faire à la maison, il peut intégrer une consigne textuelle dans la construction. L'enfant ouvre le fichier ou le lien et voit l'instruction à l'écran sans avoir besoin du cahier d'exercices.

**Champ `consigne` :**
- Optionnel, type `string`, maximum 1000 caractères (les consignes multi-étapes en contexte scolaire dépassent facilement 500 caractères)
- Lecture seule pour l'enfant (non modifiable dans l'interface)
- Défini par l'enseignant via :
  1. Le champ `consigne` dans un fichier `.tracevite` (voir §17.2)
  2. Le paramètre URL `?consigne=` (voir §8.0.2)
- Sauvegardé dans IndexedDB avec la construction (si l'enfant ferme et revient, la consigne est toujours visible)
- Non inclus dans l'historique undo/redo (ce n'est pas une action de l'enfant)
- Non imprimé dans le PDF par défaut (le PDF est la figure construite par l'enfant, pas l'énoncé de l'exercice)

**Affichage :**
- Quand une consigne est présente, un bandeau s'affiche **entre la barre de statut et le canevas** (même principe de positionnement que le bandeau de mise à jour PWA §4.1.2, mais sous la barre de statut plutôt qu'au-dessus de la barre d'actions)
- Fond : bleu très pâle (#E6F1FB), bordure inférieure 1px gris clair
- Texte : police 14px (taille ajustable via le facteur de police §13.3), noir, préfixé « **Consigne :** » en gras suivi du texte de l'enseignant
- Exemple : « **Consigne :** Construis un rectangle de 4 cm × 6 cm avec une diagonale. »
- **Retours à la ligne** (`\n`) préservés dans le texte de la consigne (les enseignants utilisent des étapes numérotées). Encodage URL : `%0A`. Le bandeau affiche le texte sur 1-2 lignes max (text-overflow: ellipsis après 2 lignes). Un clic sur le bandeau ouvre le texte complet dans un popover avec `white-space: pre-line` (retours à la ligne rendus)
- Bouton de fermeture (×) à droite (44×44px) : masque le bandeau pour la session. Un bouton discret « Voir la consigne » apparaît à côté du sélecteur de mode dans le header pour la réafficher. La consigne n'est PAS supprimée, seulement masquée
- Le bandeau se superpose aux premiers ~40px du haut du canevas (position: absolute) — ne réduit pas la zone de canevas utilisable

**Interaction avec la barre de statut :**
- Le bandeau de consigne est positionné **sous** la barre de statut, pas à la même hauteur. Les deux sont visibles simultanément
- La barre de statut conserve sa fonction de séquençage (outil actif + prochaine action) sans modification

**Note de conception :** le bandeau doit être visuellement distinct de la barre de statut pour éviter la confusion. La couleur de fond bleu pâle (vs. gris pâle de la barre de statut) et le préfixe « Consigne : » en gras assurent cette distinction. L'enfant TDC doit pouvoir ignorer la consigne une fois lue — le bandeau ne pulse pas et n'attire pas l'attention de façon répétée.

### 8.0.2 Lien d'exercice par URL

L'enseignant peut partager un lien TraceVite avec une consigne pré-remplie et un mode d'affichage via des paramètres URL. Cela permet le partage via Google Classroom, Microsoft Teams, ou tout autre plateforme sans nécessiter de téléchargement de fichier.

**Paramètres URL supportés :**
- `consigne` : texte de la consigne, encodé URL (ex : `?consigne=Construis+un+carr%C3%A9+de+4+cm`). Maximum 1000 caractères après décodage. Au-delà, tronqué silencieusement. **Retours à la ligne** : supportés via `%0A` (encodage URL standard de `\n`) **et** via le caractère `|` (pipe) comme alias. Le pipe est converti en retour à la ligne après décodage URL. Cela permet à l'enseignant de taper facilement des consignes multi-étapes : `?consigne=Étape+1|Étape+2|Étape+3` au lieu de `?consigne=Étape+1%0AÉtape+2%0AÉtape+3`. Le `\n` dans les fichiers `.tracevite` JSON reste le séparateur standard (pas de conversion pipe).
- `mode` : `simplifie` ou `complet`. Si présent, définit le mode d'affichage initial (remplace le mode par défaut mais ne verrouille pas — l'enfant peut changer).
- `level` : `2e_cycle` ou `3e_cycle`. **Rétrocompatibilité** : accepté comme alias — `2e_cycle` est converti en `simplifie`, `3e_cycle` en `complet`. Si `mode` et `level` sont présents, `mode` a priorité.

**Exemple de lien complet :**
`https://tracevite.ca/?consigne=Construis+un+rectangle+de+4+cm+%C3%97+6+cm&mode=simplifie`

**Comportement au chargement :**
1. L'application détecte les paramètres URL au démarrage
2. Si `consigne` est présent : la construction courante est auto-sauvegardée dans son créneau existant, puis un **nouveau créneau** est créé avec une construction vide et cette consigne (même comportement que « Nouvelle construction »). L'ancienne construction reste accessible dans « Mes constructions ». **Si les 50 créneaux sont pleins** : message « Tu as 50 constructions sauvegardées. Exporte ou supprime une construction dans "Mes constructions" pour ouvrir cet exercice. » avec bouton direct vers « Mes constructions ». L'enfant peut re-cliquer le lien Classroom après avoir libéré un créneau.
3. Si `mode` (ou `level` en rétrocompatibilité) est présent et valide : le sélecteur de mode est positionné sur la valeur indiquée
4. Les paramètres URL sont **consommés une seule fois** : après le chargement, l'URL est nettoyée via `history.replaceState()` (sans paramètres). Un rechargement de la page restaure la construction depuis IndexedDB (avec sa consigne), pas depuis l'URL
5. Si `consigne` est présent mais l'URL est rechargée après nettoyage : la consigne est déjà sauvegardée dans le créneau IndexedDB — rien ne se passe

**Sécurité :**
- Le texte de la consigne est affiché via `textContent` (pas `innerHTML`) — aucun risque d'injection HTML/XSS
- Les paramètres inconnus sont ignorés silencieusement (forward-compatible)
- Longueur totale de l'URL limitée par le navigateur (~2000 caractères). La consigne de 500 caractères + le domaine + les autres paramètres tiennent largement

**Limites (pas dans le scope) :**
- Pas de pré-chargement d'une figure via URL (pour partager un exercice avec une figure de départ, utiliser un fichier `.tracevite`)
- Pas de « lien de retour » pour que l'enfant soumette sa construction à l'enseignant (nécessiterait un backend, voir §18)

### 8.1 Longueurs
- Chaque segment affiche sa longueur au milieu du segment, légèrement décalé
- Unité d'affichage configurable : cm (défaut) ou mm. Un bouton toggle "cm / mm" dans la barre supérieure
- Pendant la construction : la longueur s'actualise en temps réel
- Police : lisible mais non intrusive (13px, couleur secondaire)
- Format : virgule décimale, unité affichée (ex : "4,5 cm" ou "45 mm")

### 8.2 Angles
- **Mode Simplifié** : seul le carré conventionnel d'angle droit est affiché au sommet (mêmes dimensions qu'en mode Complet : côté 12px, stroke 2px). Les angles aigus et obtus sont indiqués par un arc coloré sans valeur numérique. La classification (aigu/droit/obtus) apparaît dans le panneau latéral.
- **Mode Complet** : chaque angle formé par deux segments connectés affiche :
  - Un arc de mesure (petit arc entre les deux segments, rayon ~15px écran)
  - La valeur en degrés (ex : "90°")
  - Le type en couleur :
    - Angle droit : couleur sarcelle (#0B7285) + **carré conventionnel au sommet, côté 12px écran, stroke 2px**. Le carré doit être clairement visible même sur des constructions denses — l'identification visuelle de l'angle droit est la propriété la plus enseignée au primaire.
    - Angle aigu : couleur orange brûlé (#C24B22)
    - Angle obtus : couleur orange brûlé (#C24B22)
- La classification apparaît aussi dans le panneau latéral
- **Surcharge visuelle** : quand la construction dépasse un seuil de segments, les mesures d'angle ne s'affichent sur le canevas que pour l'élément sélectionné ou survolé. Seuil par défaut : **5 segments en mode Simplifié, 6 segments en mode Complet** (~40% des enfants TDC ont des difficultés visuo-spatiales concomitantes — un seuil trop élevé sature ces élèves). Le panneau latéral continue d'afficher tous les angles en tout temps.
  - **Survol d'un sommet** : affiche tous les angles formés à ce sommet.
  - **Survol d'un segment** : affiche les angles aux deux extrémités du segment.
  - **Figure sélectionnée** : affiche **tous les marqueurs d'angle de la figure simultanément** (ex. les 4 carrés d'angle droit d'un rectangle). C'est pédagogiquement essentiel — voir tous les angles confirme visuellement la classification.

### 8.3 Propriétés détectées
Affichées dans le panneau latéral droit en temps réel :
- Parallélisme : étiquette verte "AB // CD" + doubles barres conventionnelles (//) sur les segments concernés sur le canevas
- Perpendicularité : étiquette verte "AB ⊥ CD" + petit carré au point d'intersection
- Angle droit : étiquette verte "Angle droit en B"
- Côtés isométriques : étiquette "AB = CD" + marques de hachure conventionnelles sur les segments
- Angles congrus : étiquette "∠A = ∠C" + marques d'arc conventionnelles (simples, doubles, triples) sur les angles de même mesure dans une figure fermée. Utile pour identifier les isocèles et les parallélogrammes. Tolérance : ±0,5°.
- Figure fermée : nom de la figure si détectée (ex : "Parallélogramme", "Trapèze", "Triangle rectangle")

### 8.3.1 Masquage dynamique pendant les gestes actifs (accommodation TDC)

Pendant un geste moteur actif (tracé de segment, cercle ou ligne contrainte ; déplacement d'un point), les indicateurs non essentiels sont temporairement masqués **sur le canevas uniquement** pour réduire la charge visuelle. Le panneau de propriétés latéral continue de tout afficher en temps réel.

**Justification :** Les enfants TDC ont un déficit de double tâche. Quand leurs ressources cognitives sont allouées au contrôle moteur, leur capacité à traiter l'information visuelle périphérique chute. Les indicateurs de propriétés sont utiles avant (planification) et après (vérification) le geste, pas pendant.

| État | Angles sur canevas | Congruence / Parallélisme | Longueurs |
|------|-------------------|---------------------------|-----------|
| Au repos | Tous visibles | Visibles | Visibles |
| Tracé actif (segment, cercle, ligne contrainte) | Tous masqués | Masqués | Visibles |
| Déplacement actif | Seulement au sommet déplacé | Masqués | Visibles (temps réel) |

Le retour à l'affichage complet est immédiat dès que le geste se termine (clic du 2e point, lâché du point, Escape).

### 8.4 Algorithmes de détection de propriétés

**Parallélisme :** Deux segments sont considérés parallèles si l'angle entre leurs directions est < 0,5°. Utiliser le produit vectoriel normalisé pour la détection.

**Perpendicularité :** Deux segments sont perpendiculaires si l'angle entre eux est dans l'intervalle [89,5°, 90,5°].

**Classification des angles (évaluation par priorité — la première règle qui matche gagne) :**
1. Droit : [89,5°, 90,5°] (tolérance pour les constructions manuelles — **priorité sur aigu/obtus**)
2. Plat : [179,5°, 180,5°] — masqué en mode Simplifié (hors programme 2e cycle). **Quand 3 points sont alignés en mode Simplifié** : ne pas afficher « angle plat » mais afficher dans le panneau latéral et la barre de statut le message « Points alignés » (information géométrique utile sans introduire un concept hors programme). **Exception** : si les 3 points font partie d'une figure fermée (un point au milieu d'un côté), ne PAS afficher « Points alignés » — l'enfant voit un côté, pas trois points alignés. Le message ne s'affiche que pour des segments libres formant un angle de ~180°.
3. Aigu : ]0°, 89,5°[
4. Obtus : ]90,5°, 179,5°[
5. **Angle intérieur > 180° (polygone concave)** : pas de classification textuelle (« rentrant » est hors programme primaire). En mode Complet : afficher la valeur numérique (ex. « 270° ») + mention « angle intérieur » dans le panneau. En mode Simplifié : **pas de texte** (ni « concave » ni « non convexe » — les deux sont hors vocabulaire 2e cycle). Marqueur visuel uniquement sur le canevas : arc dépassant le demi-cercle, visuellement distinct d'un arc obtus.

Note : les intervalles sont maintenant disjoints. Un angle de 89,7° est classé « droit » (pas « aigu »). Un angle de 90,3° est classé « droit » (pas « obtus »). L'Annexe A donne les définitions mathématiques exactes; les tolérances ci-dessus sont l'implémentation pratique pour compenser l'imprécision du tracé.

**Algorithme de détection des figures fermées :**
- La détection est déclenchée quand un segment est créé et que son extrémité se connecte à un point existant (pas à chaque action).
- On recherche les **faces créées** par le segment nouvellement complété, par **parcours de face planaire** (algorithme « leftmost turn »). Note : le terme « BFS » utilisé précédemment était imprécis — un BFS classique trouve des plus courts chemins, pas des faces dans un graphe planaire. **Exécuter le leftmost-turn des DEUX côtés du nouveau segment** : chaque parcours donne une face. Ignorer la face extérieure (celle contenant l'infini / aire la plus grande). Les faces restantes sont les figures détectées. Exemple : tracer la diagonale d'un carré existant crée **deux** triangles (un de chaque côté de la diagonale) — les deux sont détectés.
- Seuls les cycles simples sont détectés (pas de point visité deux fois). **Faces dégénérées** (aire < 1mm², causées par des points colinéaires ou des dead-ends dans le parcours) sont ignorées — pas considérées comme des polygones.
- **Exemple « maison »** (carré + triangle sur le dessus) : quand le dernier segment du triangle est ajouté, le leftmost-turn d'un côté donne le triangle (3 arêtes), l'autre côté donne le pentagone (5 arêtes = face extérieure dans ce contexte). Seul le triangle est enregistré. Le carré a été détecté à l'ajout de son propre dernier segment.
- **Point ou segment partagé entre figures** : un point appartenant à deux figures fermées apparaît une seule fois dans le panneau, étiqueté « Sommet ». Un segment partagé apparaît une seule fois, étiqueté « Côté ». La section contextuelle (sélection) liste les figures : « Sommet A — Carré ABCD, Triangle ABE ». Un clic sur le nom d'une figure dans la section contextuelle **met cette figure en surbrillance** sur le canevas (contour pointillé bleu sur tous ses côtés) sans changer la sélection du point.
- Quand un point est déplacé ou un segment supprimé, les figures contenant ce point/segment sont **réévaluées**. Si le cycle est brisé, la figure est retirée, le vocabulaire revient à « Point/Segment » (§9.0). **Re-détection à la suppression** : après suppression d'un segment, re-exécuter la détection de face planaire sur les points qui étaient aux extrémités du segment supprimé. Cela permet de re-détecter des figures qui existaient avant l'ajout du segment supprimé (ex. : supprimer la diagonale d'un carré divisé re-détecte le carré original).
- **Re-classification en temps réel pendant le déplacement** : quand un point est déplacé, la classification de toutes les figures contenant ce point est recalculée en continu. Si le déplacement rend un polygone auto-intersectant, « Figure croisée » s'affiche. La détection d'auto-intersection est en temps réel (O(n²) sur < 50 segments est trivial, < 1ms).
- **Auto-intersection à la création** : quand un nouveau segment croise un segment existant, un point d'intersection est automatiquement créé et les deux segments sont scindés (activé par défaut, désactivable dans les Paramètres). Conséquence : un X tracé à l'intérieur d'un rectangle crée les points d'intersection et les sous-segments, permettant la détection des triangles résultants. **L'auto-intersection ne se déclenche PAS lors du déplacement** de points — le déplacement est un geste d'ajustement, pas de construction ; créer des points imprévus pendant un déplacement serait imprévisible et déstabilisant pour un enfant TDC.
- Les polygones auto-intersectants (cycle de segments dont les côtés se croisent) sont détectés comme figures fermées mais ne sont pas classifiés. Un message « Figure croisée » apparaît à la place.

**Classification des figures fermées :** Quand une figure est fermée (cycle de segments connectés), tenter d'identifier :
- 3 côtés : Triangle → la classification est **cumulative en mode Complet** (pas mutuellement exclusive). Un triangle peut être « rectangle isocèle » ou « rectangle scalène ». Propriétés à tester indépendamment :
    - Équilatéral : 3 côtés égaux (implique isocèle)
    - Isocèle : au moins 2 côtés égaux
    - Rectangle : 1 angle droit
    - Scalène : aucune paire de côtés égaux
    - **Mode Complet** : combiner les propriétés applicables (ex : « Triangle rectangle isocèle »)
    - **Mode Simplifié** : afficher **une seule classification**, la plus spécifique par priorité : **équilatéral > rectangle > isocèle > scalène**. L'angle droit prime sur l'isocèle car c'est la propriété la plus visuellement saillante (marqueur carré sur le canevas) et la plus enseignée au 2e cycle. Exemple : un triangle rectangle isocèle est affiché « Triangle rectangle » en mode Simplifié, « Triangle rectangle isocèle » en mode Complet.
- 4 côtés : Quadrilatère → sous-classifier en utilisant le nom **le plus spécifique** applicable : carré (4 côtés égaux + 4 angles droits), rectangle (4 angles droits), losange (4 côtés égaux), parallélogramme (2 paires de côtés parallèles), trapèze (1 paire de côtés parallèles), quadrilatère quelconque. **Hiérarchie inclusive :** un carré est aussi un rectangle, un losange, un parallélogramme et un trapèze. Afficher le nom le plus spécifique par défaut (ex. : « Carré »). Un toggle « Voir la hiérarchie » dans le panneau latéral permet d'afficher la classification complète (ex. : « Carré — aussi : rectangle, losange, parallélogramme »). Ce toggle est **masqué par défaut**, y compris en mode Complet — l'inclusion des quadrilatères est introduite progressivement en 5e année et le toggle peut être prématuré sans accompagnement. L'enseignant peut l'activer dans les paramètres (`.tracevite-config`) quand la notion a été enseignée. En mode Simplifié, seul le nom le plus spécifique est affiché, sans toggle possible.
- 5+ côtés : Polygone à N côtés
- Tolérance pour "égal" entre longueurs : ±1mm. Tolérance pour "angle droit" : ±0,5°.

**Périmètre et aire : NON AFFICHÉS.** L'outil compense les gestes moteurs (règle, compas, rapporteur), pas les calculs. L'enfant voit les longueurs de chaque côté et les angles ; il calcule le périmètre et l'aire lui-même. L'interface `Figure` ne contient pas de champs `perimeterMm` ni `areaMm2`. La fonction `shouldDisplayArea` est supprimée. Le calcul interne (formule du lacet) est conservé dans `geometry.ts` pour un usage futur éventuel (v2 : affichage optionnel de la formule d'aire pour renforcer l'apprentissage).

Pour les polygones simples non auto-intersectants, le calcul interne utilise :
```
Aire = 0.5 * |Σ(x_i * y_{i+1} - x_{i+1} * y_i)|
```

---

## 9. Panneau latéral droit (Properties Panel)

Visible par défaut. Largeur fixe de ~200px. **Fond distinct** (#F5F7FA au lieu de blanc) et **bordure gauche bleue** (2px UI_PRIMARY) pour se distinguer visuellement du canevas — les enfants TDC avec des difficultés figure/fond pourraient confondre les mesures du panneau avec les labels sur le canevas. **Escamotable** via un bouton toggle (44×44px) pour libérer l'espace canevas sur les écrans 1366×768 — le panneau réduit l'espace canevas effectif à ~1100px de large. **Le panneau démarre fermé sur les écrans de hauteur < 800px** (l'espace canevas minimum acceptable est ~1000×550px). **Badge de notification** : quand le panneau est fermé et qu'une nouvelle propriété est détectée (première figure fermée, premier parallélisme, etc.), un point bleu (8px) apparaît sur le coin supérieur droit du bouton toggle du panneau. Le badge disparaît à l'ouverture du panneau. L'état ouvert/fermé est sauvegardé dans les préférences.

**Sections en accordéon :** chaque section (Segments/Côtés, Angles, Propriétés, Mesures, section contextuelle) est **collapsible** individuellement via un clic sur son en-tête. **État par défaut : seule la section contextuelle (élément sélectionné) est ouverte.** Cela réduit la surcharge d'information pour les enfants avec difficultés visuo-spatiales (~40% des TDC) ou TDAH comorbide (~50% des TDC). L'enfant déplie la section qui l'intéresse. L'état ouvert/fermé des sections est sauvegardé par construction.

**Sélection via le panneau** : un clic sur le nom d'un élément dans le panneau (ex. « Point A », « Segment AB ») **sélectionne cet élément** sur le canevas et ouvre la barre d'actions contextuelle. Cela permet de sélectionner et gérer (supprimer, verrouiller) un point isolé sans changer d'outil — essentiel en mode Segment où un clic sur un point du canevas commence un segment plutôt que de le sélectionner.

Contient, de haut en bas :

### 9.0 Vocabulaire contextuel (exigence PFEQ)
Le panneau adapte le vocabulaire selon le contexte géométrique :
- Un point libre s'affiche comme **« Point A »**. Quand il fait partie d'une figure fermée identifiée, il s'affiche comme **« Sommet A »**.
- Un segment libre s'affiche comme **« Segment AB »**. Quand il fait partie d'une figure fermée identifiée, il s'affiche comme **« Côté AB »**.
- Cette distinction est une exigence forte du milieu scolaire québécois (PFEQ). Le modèle de données interne reste `Point` et `Segment`, mais l'affichage utilise le vocabulaire approprié.

### 9.1 Section "Segments" / "Côtés"
Liste de tous les segments avec :
- Étiquette (ex : "AB") — préfixée "Côté" si partie d'une figure fermée, "Segment" sinon
- Longueur dans l'unité d'affichage active (cm ou mm)
- **Annotation « côtés de l'angle droit »** : quand un triangle rectangle est détecté, les deux côtés adjacents à l'angle droit sont annotés dans le panneau avec la mention « (côté de l'angle droit) » en gris, après la longueur (ex. : « Côté AB — 3 cm (côté de l'angle droit) »). Le troisième côté n'a pas d'annotation (le terme « hypoténuse » est hors vocabulaire primaire). Cette annotation aide l'enfant à faire le lien entre la propriété géométrique et les mesures, conformément au vocabulaire PFEQ qui utilise « côtés de l'angle droit » (jamais « cathètes », terme du secondaire).

### 9.2 Section "Angles"
Liste de tous les angles détectés, adaptée au mode d'affichage :
- Sommet (ex : "A")
- **Mode Simplifié** : classification seulement (aigu/droit/obtus) avec code couleur. Pas de mesure en degrés.
- **Mode Complet** : classification + mesure en degrés

### 9.3 Section "Propriétés détectées"

**Toggle « Masquer les propriétés »** en haut de cette section (icône œil). Quand activé, les éléments suivants sont masqués à la fois dans le panneau et sur le canevas :
- Propriétés détectées (parallélisme, perpendicularité, angles droits, côtés/angles congrus, nom de figure)
- Marques conventionnelles (doubles barres //, hachures de congruence, carré d'angle droit, arcs d'angles congrus)

**Restent visibles même quand le toggle est activé :** les segments, points, cercles, étiquettes de sommets (A, B, C), longueurs de segments et mesures d'angles individuels. L'objectif est que l'enfant voie ce qu'il a tracé et ses dimensions, mais doive identifier lui-même les propriétés géométriques.

L'enseignant peut l'activer en contexte d'évaluation pour que l'élève identifie les propriétés lui-même. Ce toggle préserve le principe « l'enfant fait le raisonnement, l'outil exécute le geste ». L'état du toggle est sauvegardé par construction.

**Feedback rassurant :** quand le toggle passe en mode « masqué », la barre de statut affiche pendant 3 secondes : « Mode évaluation — les propriétés sont masquées. Tes segments et mesures sont toujours là. » Évite que l'enfant TDC pense avoir « cassé » quelque chose.

**Note PI :** pour être utilisé lors de l'évaluation ministérielle de mathématiques (6e année), TraceVite doit être documenté dans le Plan d'intervention (PI) de l'élève comme mesure d'adaptation. Voir Annexe B pour les instructions destinées à l'enseignant.

Quand les propriétés sont visibles, la section affiche :
- Parallélismes (ex : badge vert "AB // CD")
- Angles droits (ex : badge vert "Angle droit en B")
- Côtés isométriques
- Angles congrus (∠A = ∠C)
- Nom de la figure fermée si détectée

### ~~9.4 Section "Mesures"~~
**Supprimée.** Le périmètre et l'aire ne sont pas affichés (voir §8.4). L'enfant voit les longueurs de chaque côté et les angles ; il calcule le périmètre et l'aire lui-même.

### 9.5 Section "Longueur du segment" (contextuelle)
- Apparaît quand un segment est sélectionné
- Champ de saisie pour fixer une longueur exacte
- Bouton "Fixer"

---

## 10. Barre d'outils supérieure (Toolbar)

Barre horizontale en haut du canevas (pas de header séparé — le logo, l'indicateur de sauvegarde et le sélecteur de mode sont intégrés directement dans la toolbar pour maximiser l'espace canevas). Icônes + texte pour chaque outil.

**Structure en deux zones :** La toolbar est divisée en une zone scrollable (logo, sauvegarde, outils, grille, unité, aimant) et une zone fixe droite (sélecteur de mode, bouton aide). Cela empêche le dropdown du sélecteur de mode d'être clippé par le scroll horizontal sur petit écran.

**Indicateur de l'outil actif :** L'outil actif a un encadrement bien contrasté (bordure bleue 2px + fond bleu pâle), pas juste un fond pâle. Le nom de l'outil est aussi affiché dans la barre de statut contextuelle (voir §10.1).

**Révélation progressive (2e cycle) :** En mode 2e cycle, seuls les outils **Segment**, **Déplacer** et **Réflexion** sont visibles par défaut dans la toolbar. L'outil Longueur et les contrôles avancés (sélecteur de grille, toggle d'unité) sont accessibles via un bouton « Plus d'outils » (icône : trois points ou chevron). Cela réduit la surcharge de choix pour les enfants de 8-9 ans, dont ~50% ont un TDAH comorbide avec difficultés de fonctions exécutives. En mode 3e cycle, tous les outils applicables sont visibles directement. L'enseignant peut forcer l'affichage complet dans les paramètres.

De gauche à droite (tous les outils ont une icône + texte) :
1. **Segment** (outil par défaut, icône : ligne diagonale avec points aux extrémités)
2. **Point** (icône : cercle plein) — masqué par défaut, activable dans les paramètres
3. **Déplacer** (icône : flèche de déplacement quatre directions)
4. **Cercle** (icône : cercle vide avec point central) — visible uniquement en mode 3e cycle
5. **Réflexion** (icône : axe vertical pointillé + points symétriques)
6. **Reproduire** (icône : deux segments décalés, le second à 50% d'opacité) — derrière « Plus d'outils » en 2e cycle
7. **Perpendiculaire** (icône : angle droit avec carré marqueur) — derrière « Plus d'outils » en 2e cycle
8. **Parallèle** (icône : deux lignes diagonales parallèles) — derrière « Plus d'outils » en 2e cycle
9. **Translation** (icône : point source → flèche pointillée → point destination) — visible uniquement en mode 3e cycle
10. **Longueur** (icône : règle avec graduations) — derrière « Plus d'outils » en 2e cycle

Toutes les icônes sont des SVG 20×20 en stroke, couleur `currentColor` (héritée du bouton). Style uniforme pour la reconnaissance rapide — les enfants TDC balayent visuellement plutôt que lire.

À droite de la barre :
- Toggle « 🧲 Aimant » (on/off). **Ne pas utiliser le mot « Accrochage »** dans l'interface — terme abstrait pour les 8-9 ans. Le terme technique « snap » reste dans le code et la spec; l'interface dit « Aimant ».
- Sélecteur de grille (5 mm / 1 cm / 2 cm)
- Toggle d'unité (cm / mm)
- Bouton **?** (aide / tutoriel) — à l'extrême droite, lance le tutoriel interactif à la demande

**Curseurs contextuels du canevas :** Le curseur CSS change selon l'outil actif pour fournir un feedback permanent au point de focus visuel (accommodation TDC — réduit les allers-retours toolbar↔canevas).

| Outil(s) | Curseur | Raison |
|----------|---------|--------|
| Segment, Point, Cercle, Réflexion, Perpendiculaire, Parallèle, Translation, Longueur, Reproduire | `crosshair` | Construction / placement de points |
| Déplacer (idle) | `grab` | Invite à « ramasser » un point |
| Déplacer (point ramassé) | `grabbing` | Point en cours de déplacement |
| Tout outil idle + survol d'un élément | `pointer` | Signale la sélection possible (cross-cutting) |
| Mode suppression | `crosshair` | Override — cible de suppression |

Priorité : mode suppression > survol élément (idle) > outil actif.

### 10.1 Barre de statut contextuelle (indicateur de séquençage)

Barre fine immédiatement sous la toolbar, fond bleu pâle distinct (#E3EBF5), accent bleu 3px à gauche, texte 13px. Le nom de l'outil est affiché dans un **badge/pill bleu** (fond UI_PRIMARY, texte blanc, border-radius 4px) suivi de l'instruction en texte normal. Cette séparation visuelle aide les enfants TDC avec des difficultés de séquençage à identifier rapidement l'outil actif et l'action attendue sans regarder la toolbar. Quand une consigne est définie et que la bannière est fermée, un bouton « Voir la consigne » apparaît dans la barre de statut. Exemples :

| Contexte | Message affiché |
|----------|----------------|
| Outil Segment, aucun point placé | « **Segment** — Clique pour placer le premier point » |
| Outil Segment, premier point placé | « **Segment** — Clique pour placer le deuxième point » |
| Chaînage actif après création | « **Segment** — Continue depuis le sommet B. Clique ailleurs ou appuie Échap pour terminer. » |
| Outil Cercle, aucun point placé | « **Cercle** — Clique pour placer le centre » |
| Outil Cercle, centre placé | « **Cercle** — Clique pour fixer le rayon » |
| Outil Déplacer, rien sélectionné | « **Déplacer** — Clique sur un point pour le ramasser » |
| Outil Déplacer, point ramassé | « **Déplacer** — Clique pour déposer le point. Clique ailleurs ou appuie Échap pour annuler. » |
| Outil Réflexion, aucun axe | « **Réflexion** — Clique deux points pour tracer l'axe de symétrie » |
| Outil Réflexion, axe tracé | « **Réflexion** — Clique sur une figure pour la refléter » |
| Outil Longueur | « **Longueur** — Clique sur un segment pour régler sa longueur » |

**Note de conception :** Cet indicateur de séquençage est un accommodement courant pour les difficultés de planification motrice associées au TDC (réf. : littérature sur les aides procédurales externes). Il soutient la mémoire de travail et la planification motrice sans gêner l'enfant avancé.

---

## 11. Barre inférieure (Action bar)

De gauche à droite :
- Bouton « ↩ Annuler » (Ctrl+Z) — undo. **Visuellement distinct du Rétablir** : le bouton Annuler a un fond bleu pâle (#E6F0FB) au repos, pas le Rétablir (fond blanc). Les icônes miroir (↩ vs ↪) sont insuffisantes pour un enfant TDC avec difficultés visuo-spatiales — la couleur de fond crée une asymétrie visuelle immédiate.
- Bouton « ↪ Rétablir » (Ctrl+Y) — redo. Fond blanc au repos.
- Espace flexible
- Note "Échelle 1:1 sur papier"
- Bouton "Imprimer" (proéminent, couleur bleue) — **désactivé (grisé)** si le canevas est vide (aucun segment ni cercle). Pas de message d'erreur — le bouton grisé est auto-explicatif.

À l'extrémité droite, séparé visuellement par un espace :
- Bouton « Nouvelle construction » (texte **complet, jamais tronqué** — un test avec des enfants de 8 ans a montré que « Nouvelle » seul est ambigu : « nouvelle quoi? ». Couleur rouge, avec confirmation — sauvegarde d'abord la construction courante dans son créneau « Mes constructions », puis crée une construction vide)

**Dialogue de confirmation** (langage adapté à un enfant de 8-12 ans) :
- Texte : « Tu veux commencer une nouvelle figure? » + sous-texte rassurant : « Ta figure "{nom de la construction courante}" est sauvegardée. Tu peux la retrouver dans "Mes constructions". »
- Bouton gauche, gros et bleu : « Non, je continue » (action par défaut)
- Bouton droit, petit et rouge : « Oui, nouvelle figure »
- Les boutons sont visuellement très distincts (couleur, taille, position) pour éviter un clic errant sur l'action destructive.
- **Note de conception :** Le mot « effacer » peut être stressant pour un enfant habitué à perdre son travail. La formulation rassure que le travail est sauvegardé.

**Note de conception :** Le bouton « Nouvelle construction » est intentionnellement séparé des boutons Annuler/Rétablir et de couleur différente. Un clic errant de 15px (fréquent chez un enfant TDC) ne doit pas pouvoir effacer tout le travail.

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
- Générer le PDF **programmatiquement** avec jsPDF : tracer les lignes, cercles, arcs et texte directement via l'API jsPDF en utilisant les coordonnées internes (mm → unités PDF, facteur 2.835). **Ne pas utiliser svg2pdf.js** — cette librairie a des bugs connus avec les polices et attributs SVG avancés, et ajoute une dépendance de maintenance inutile.
- CRITIQUE : ne pas utiliser de conversion via image/raster (canvas.toDataURL) car la précision dimensionnelle serait perdue
- CRITIQUE : le PDF doit être configuré pour s'imprimer sans mise à l'échelle. Ajouter le viewer preference `/PrintScaling /None` dans le PDF.

### 12.5 Dialogue d'impression
Le bouton « Imprimer » de la barre inférieure ouvre un dialogue modal unique offrant les deux chemins d'impression. Contenu du dialogue :
- **Toggle orientation : Portrait / Paysage** (portrait par défaut). Beaucoup de constructions au 3e cycle (frises, figures allongées) bénéficient du mode paysage. Ce toggle est toujours visible, pas seulement en cas de débordement.
- **Avertissement d'échelle** (masquable) : **une phrase en gros** (16px, gras) : « IMPRIME À 100% (taille réelle) » + une illustration simple montrant la boîte de dialogue d'impression du navigateur avec une flèche pointant vers le réglage « Taille réelle ». Le texte explicatif long (« Ne coche pas "Ajuster à la page"... ») est remplacé par l'illustration — les enfants avec TDAH comorbide (~50% des TDC) ne lisent pas les blocs de texte, mais captent une image en 1 seconde (test utilisateur confirmé). Case à cocher « Ne plus afficher » (stockée en IndexedDB). Quand masqué, seul l'avertissement est caché; le reste du dialogue est toujours affiché.
- **Toggle « Inclure la consigne »** : visible uniquement si une consigne est définie. Quand activé, le texte de la consigne est imprimé en haut de la page (police 9pt, italique, préfixé « Consigne : »). Utile pour l'enseignant qui vérifie les travaux — l'énoncé et la figure sont sur la même feuille.
- **Bouton « Télécharger le PDF »** (proéminent, bleu) — génère et télécharge le fichier PDF
- **Bouton « Imprimer directement »** (secondaire, à droite du bouton PDF) — déclenche `window.print()` avec la feuille CSS @media print (§21.5)

Les deux chemins (PDF et impression directe) produisent un résultat identique :
- Noir et blanc uniquement (toutes couleurs converties en noir)
- Grille masquée sauf si le toggle « Grille sur l'impression » est activé (dans ce cas, gris 10%)
- Segment-témoin de 5 cm en bas à droite
- Mention « TraceVite — Échelle 1:1 » en bas à gauche
- Étiquettes, mesures et marques conventionnelles conservées
- L'orientation (portrait/paysage) s'applique aux deux chemins

### 12.6 Validation de l'échelle
- Inclure un segment-témoin de 5 cm dans le coin inférieur droit du PDF, avec la mention "vérification : ce segment mesure 5 cm". Permet à l'enseignant (et à l'enfant) de valider que l'impression est à l'échelle.

---

## 13. Interface utilisateur — Spécifications visuelles

### 13.1 Layout général

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] TraceVite  [Simplifié ▾] [Mes constr.]               │  ← Header
├──────────────────────────────────────────────────────────────┤
│ [▣Segment] [Cercle] | [Réflexion] | [Déplacer] [📏] │ [5mm/1cm/2cm] [cm/mm] [Accrochage ON] │  ← Toolbar
├──────────────────────────────────────────────────────────────┤
│ Segment — Clique pour placer le premier point               │  ← Status bar
├──────────────────────────────────────────────────────────────┤
│ Consigne : Construis un rectangle de 4 cm × 6 cm.       [×] │  ← Consigne (optionnel, §8.0.1)
├─────────────────────────────────────────┬────────────────────┤
│                                         │ Sommets            │
│                                         │  Côté AB  5 cm     │
│                                         │  Côté BC  3,5 cm   │
│          CANEVAS DE CONSTRUCTION        │                    │
│            (grille 1 cm)                │ Angles             │
│                                         │  A  obtus          │
│                                         │  B  droit ✓        │
│                                         │                    │
│                                         │ Propriétés         │
│                                         │  [AB // CD]        │
│                                         │  « Carré »         │
│                                         │                    │
│                                         │ [Fixer long.]      │
├─────────────────────────────────────────┴────────────────────┤
│ [Annuler] [Rétablir]                1:1  [Imprimer] [Nouv.] │  ← Action bar
└──────────────────────────────────────────────────────────────┘
```

Le bandeau de consigne n'apparaît que si une consigne est définie (via fichier `.tracevite` ou paramètre URL, voir §8.0.1). En l'absence de consigne, le canevas commence directement sous la barre de statut.

### 13.2 Palette de couleurs

Utiliser un thème clair par défaut (cohérent avec le milieu scolaire). Principe fondamental : la couleur ne doit **jamais** être le seul vecteur d'information — toujours doubler par un marqueur de forme (voir §13.4).

#### Canevas

| Élément | Couleur | Ratio contraste (sur blanc) |
|---------|---------|-----------------------------|
| Segments (tracés) | Bleu foncé (#185FA5) | 6,6:1 |
| Points (sommets) | Bleu foncé (#185FA5) | 6,6:1 |
| Étiquettes (A, B, C…) | Bleu foncé (#185FA5) | 6,6:1 |
| Segment fantôme (en création) | Bleu semi-transparent (#85B7EB, 60% opacité) | — (décoratif) |
| Grille | Gris très pâle (#E5E5E5, 50% opacité) | — (décoratif) |
| Guides d'accrochage (parallèle, perpendiculaire) | Sarcelle (#0B7285) en pointillé | 5,6:1 |
| Arc/carré d'angle droit | Sarcelle (#0B7285) | 5,6:1 |
| Arc d'angle aigu/obtus | Orange brûlé (#C24B22) | 4,9:1 |
| Mesures de longueur (texte) | Bleu gris foncé (#3A6291) | 6,5:1 |
| Sélection | Bleu pâle (#D0E2F5) + contour pointillé | — (décoratif) |
| Accrochage (snap feedback) | Sarcelle (#0B7285) + pulsation | 5,6:1 |
| Fond du canevas | Blanc légèrement bleuté (#FAFCFF) | — (évoque le papier quadrillé, familier pour l'enfant — transforme l'impression « logiciel » en « cahier numérique ») |

**Note daltonisme :** L'ancien vert (#0F6E56) a été remplacé par sarcelle (#0B7285) pour améliorer la distinction avec l'orange (#C24B22) chez les personnes avec daltonisme rouge-vert (~8% des garçons). En simulation deutéranopie : sarcelle → bleu-gris, orange → brun-jaune — nettement distinguables. Les mesures ont été assombries (#4A6FA5 → #3A6291) pour un ratio plus confortable à 13px. Tous les ratios WCAG AA ≥ 4,5:1 sur fond blanc.

#### Interface (UI)

| Élément | Couleur |
|---------|---------|
| Fond de l'application | Gris bleuté très pâle (#F5F7FA) |
| Surface (panneaux, toolbar, dialogues) | Blanc (#FFFFFF) |
| Texte principal | Quasi-noir bleuté (#1A2433) — ratio 14,8:1 |
| Texte secondaire | Gris foncé (#4A5568) — ratio 7,0:1 |
| Bordures et séparateurs | Gris (#D1D8E0) |
| Bordure de focus | Bleu (#185FA5), outline 2px |
| Bouton primaire (Imprimer, etc.) | Bleu (#185FA5), texte blanc |
| Bouton primaire survol | Bleu foncé (#134D87) |
| Outil actif | Fond bleu pâle (#E6F0FB) + bordure bleu (#185FA5) |
| Bouton destructeur (Nouvelle construction) | Rouge (#C82828), texte blanc |
| Bouton destructeur survol | Rouge foncé (#A02020) |
| Désactivé (fond) | Gris pâle (#E8ECF0) |
| Désactivé (texte) | Gris moyen (#9CA3AF) — ratio 2,7:1 (intentionnel) |
| Toast / notification | Fond quasi-noir (#1A2433), texte blanc |
| Barre de statut (fond) | Bleu pâle (#E3EBF5) |

### 13.3 Typographie

- Police système : sans-serif (system-ui, -apple-system, etc.)
- Étiquettes sur le canevas : **14px** pour les noms de sommets, **13px** pour les mesures (minimum 13px — beaucoup d'enfants TDC ont des difficultés visuo-spatiales)
- Panneau latéral : 13px pour le contenu, 12px pour les titres de section (uppercase, letter-spacing)
- Barre d'outils : 13px
- Barre de statut : 13px
- **Taille ajustable** : un contrôle dans les paramètres permet d'augmenter la taille de toutes les polices (facteur 1x / 1.25x / 1.5x). Le scaling s'applique à toutes les polices du canevas et de l'interface (toolbar, panneau, barre de statut, dialogues). Les éléments de layout (toolbar, boutons 44×44px, panneau 200px) **ne changent pas** de taille — seul le texte grandit. Le PDF n'est **pas** affecté par le scaling d'affichage (tailles fixes : 10pt étiquettes, 8pt mesures). Le réglage de taille de police est **global** (sauvegardé dans les préférences, pas par construction).

### 13.4 Considérations TDC pour l'interface

- **Zone de hit-detection des segments** : un segment de 0,5mm de trait a une zone de détection de clic de **5mm physiques de chaque côté** (10mm de large total). Cette valeur est multipliée par le profil de tolérance (×1.5, ×2.0). Un trait fin serait impossible à cliquer pour un TDC sans cette zone élargie.
- **Zones de clic larges** : tous les boutons au minimum 44×44px (recommandation accessibilité tactile). **Espacement minimum de 8px** entre boutons adjacents — l'espacement est aussi important que la taille des cibles pour réduire les activations accidentelles (principe de la loi de Fitts).
- **Pas de double-clic** : toutes les actions sont en clic simple. **Debounce des clics canevas** : un délai de **150ms** est appliqué entre deux `pointerdown` consécutifs sur le canevas dans le même état machine. Les enfants TDC produisent fréquemment un re-bound involontaire du doigt qui génère un double-clic rapide. Sans debounce, cela créerait deux actions successives non intentionnelles (ex. : deux points superposés, ou un point + un segment fantôme). Ce debounce ne s'applique qu'aux clics sur le canevas, pas aux boutons de l'interface (les boutons ont déjà une protection par leur propre gestion d'état).
- **Pas de clic droit** : toutes les actions sont accessibles par clic simple + barre contextuelle
- **Pas de geste dual (maintien + mouvement)** : le mode pick-up/put-down est le défaut pour toutes les actions de déplacement. La contrainte d'angle (Shift) fonctionne en toggle (appui unique), pas en maintien.
- **Seuil de détection du glissé (drag)** : un mouvement de souris n'est interprété comme un clic-glissé qu'après **1,5mm physiques de déplacement** depuis le point initial (pointerdown). En deçà, c'est un clic simple. Ce seuil est en mm physiques (comme les tolérances de snap) et converti en pixels CSS au runtime via `devicePixelRatio` et densité écran (~8px CSS sur Chromebook 135dpi, ~11px CSS sur Retina 2x). Les enfants TDC bougent involontairement de 0,5-1mm pendant un clic — un seuil trop bas provoque des micro-drags parasites et des placements erratiques. Ce seuil s'applique à toutes les interactions (canevas, boutons, barre d'actions). **Configurable** dans `.tracevite-config` (plage 1,0-3,0mm) pour ajustement par l'ergo après observation. Non multiplié par le profil de tolérance (c'est un seuil de détection d'intention, pas de précision motrice).
- **Note sur les constantes d'accessibilité** : toutes les valeurs issues d'estimations de conception (seuil de drag, tolérances de snap, timeout de chaînage, seuil de surcharge visuelle, durée micro-confirmation) sont des **estimations à ajuster après observation**. Les stocker comme constantes nommées dans un fichier dédié (`src/config/accessibility-constants.ts`) pour faciliter les ajustements.
- **Taille d'affichage des points à l'écran** : les points sont affichés avec un rayon de **4mm physiques** à l'écran (~15px sur un écran 96dpi, ~18px sur un Chromebook 135dpi). La zone de hit-detection est couverte par le snap aux points existants (7mm, §7.1), mais la cible visuelle doit être proportionnelle pour que l'enfant puisse la voir et la viser. Le rayon de 1mm spécifié au §12.2 ne s'applique qu'au **PDF imprimé** (trait fin sur papier, cohérent avec un tracé à la règle).
- **Pas de geste de précision** : le snap compense le manque de précision motrice
- **Feedback visuel immédiat** : chaque action a un retour visuel dans les 16ms (pas de latence perceptible)
- **Pas de menus déroulants imbriqués** : tous les outils sont visibles d'un coup
- **Police minimum 13px** sur le canevas pour les mesures et étiquettes. Ajustable en plus grand via les paramètres. (Beaucoup d'enfants TDC ont des difficultés visuo-spatiales concomitantes.)
- **Couleurs + marqueurs de forme** : les codes couleur (sarcelle = droit/parallèle, orange = aigu/obtus) sont optimisés pour le daltonisme (voir §13.2, note daltonisme). En complément, utiliser des marqueurs de forme distincts : carré conventionnel pour angle droit, arc simple pour aigu, arc avec trait supplémentaire (arc + petite barre) pour obtus. Les arcs simples/doubles/triples sont réservés aux marqueurs d'angles congrus (§8.3) et ne doivent pas servir à distinguer aigu/obtus. Cela garantit la lisibilité sans dépendre uniquement de la couleur et sans conflit entre les deux conventions de marquage.
- **Tolérance d'erreur** : undo 100+ niveaux (Ctrl+Z), pas de perte de travail accidentelle
- **Attributs `aria-label`** en français sur tous les boutons de la toolbar, la barre d'actions et les contrôles. L'élément `<html>` porte `lang="fr-CA"` — les lecteurs d'écran utilisent la langue du document, pas besoin d'attribut `lang` par élément. Le canevas SVG racine porte `role="application"` avec `aria-label="Canevas de construction géométrique"` (l'outil est intrinsèquement visuel — les éléments individuels n'ont pas de rôles ARIA détaillés). Même si le public cible n'est pas déficient visuel, certains enfants TDC ont des comorbidités. Permet aussi la compatibilité avec les outils de test automatisé.
- **Pluriels en français** : gérer systématiquement les accords singulier/pluriel dans le panneau latéral et les messages (« 1 côté » vs « 2 côtés », « 1 angle droit » vs « 3 angles droits »). Les en-têtes de section utilisent toujours le pluriel (« Côtés », « Angles », « Propriétés »).
- **Navigation clavier dans l'interface (MVP)** : la navigation clavier dans le **canevas SVG** est hors scope MVP (Annexe C), mais la navigation dans l'**interface** (toolbar, panneau latéral, dialogues, barre d'actions) doit fonctionner au MVP : Tab entre les éléments interactifs, Entrée pour activer. Cela est gratuit si les éléments interactifs utilisent des **éléments HTML sémantiques** (`<button>`, `<input>`, `<select>`) plutôt que des `<div>` avec `onClick`. Le sélecteur de niveau personnalisé (§8.0) doit supporter les touches flèches haut/bas et Entrée pour la sélection, conformément aux attributs `role="listbox"` / `role="option"` déjà spécifiés. La bordure de focus (bleu #185FA5, outline 2px, §13.2) doit être visible sur tous les éléments focusables.

---

## 14. Raccourcis clavier

**Les raccourcis à lettre unique sont désactivés par défaut.** Un toggle dans les paramètres permet de les activer (l'enseignant ou l'accompagnateur les active quand l'enfant est prêt). Les raccourcis avec modificateur (Ctrl+Z, etc.) et Escape sont toujours actifs.

Quand les raccourcis à lettre unique sont activés :
- Ils sont désactivés automatiquement quand un champ de saisie texte a le focus
- Tout changement d'outil **via raccourci clavier** affiche un **toast** centré horizontalement sur le canevas, positionné à ~20% du haut (ex : « Outil : Segment »). Le toast disparaît au prochain clic ou après 5 secondes (~50% des enfants TDC ont un TDAH comorbide — 3s est insuffisant pour les enfants avec difficultés de traitement de l'information). Chaque nouveau toast **remplace** le précédent (pas d'empilement). Le toast est non-bloquant (`pointer-events: none`). Les changements d'outil par clic sur la toolbar n'affichent **pas** de toast (le clic est déjà une confirmation visuelle).

| Raccourci | Action | Toujours actif ? |
|-----------|--------|:---:|
| S | Outil Segment | Non (lettre) |
| P | Outil Point | Non (lettre) |
| C | Outil Cercle | Non (lettre) |
| V | Outil Déplacer | Non (lettre) |
| M | Outil Longueur | Non (lettre) |
| R | Outil Réflexion | Non (lettre) |
| G | Toggle accrochage grille | Non (lettre) |
| Escape | Annuler action / désélectionner / revenir à l'outil Segment / fermer tout dialogue | **Oui** |
| Delete ou Backspace | Supprimer l'élément sélectionné | **Oui** |
| Ctrl+Z | Annuler | **Oui** |
| Ctrl+Y ou Ctrl+Shift+Z | Rétablir | **Oui** |
| Ctrl+P | Imprimer (export PDF) | **Oui** |
| Shift (appui unique) | Toggle contrainte d'angle à 15° incréments (reste actif jusqu'au prochain appui) | **Oui** |

**Contrainte d'angle (Shift) — détails :**
- Appui unique sur Shift → active la contrainte. Le segment en cours de création est limité aux multiples de 15° **par rapport à l'horizontale absolue** (0°, 15°, 30°, 45°, ...), pas par rapport au segment précédent. C'est le comportement standard des outils de dessin.
- Un deuxième appui sur Shift → désactive la contrainte.
- La contrainte est aussi désactivée automatiquement par : Escape, changement d'outil, ou fin de la création du segment.
- **Interaction avec le snap d'angle (§7.1)** : quand la contrainte Shift est active, elle **remplace** le snap d'angle (priorité 4). Les incréments de 15° de Shift priment sur les guides de parallélisme/perpendicularité. Les snaps de position (points, grille, milieu, alignement) restent actifs.
- Indicateur visuel : la barre de statut affiche « Contrainte 15° active » en complément du message de l'outil. **Le curseur lui-même change d'apparence** : un petit indicateur d'aimant (ou de contrainte) est attaché au curseur CSS (`cursor: url(...)`) pour signaler visuellement le mode contraint. Les enfants avec difficultés d'attention partagée ne consultent pas la barre de statut pendant qu'ils se concentrent sur le canevas — l'indicateur doit être **au point de focus visuel**, c'est-à-dire au curseur.
- Feedback visuel : un arc discret en pointillé montre les angles disponibles autour du premier point.

### 14.1 Escape — Bouton panique

Escape a un comportement hiérarchique prévisible. À chaque pression, il effectue la première action applicable dans cet ordre :
1. Fermer tout dialogue, overlay ou champ de saisie ouvert
2. Annuler l'action en cours (segment en construction, déplacement en cours)
3. Désélectionner tout
4. Revenir à l'outil Segment (outil par défaut)

Un enfant TDC qui « ne sait plus où il en est » peut marteler Escape pour revenir à un état neutre et prévisible.

---

## 15. Undo / Redo

**Architecture : snapshots complets.** Chaque étape de l'historique est un snapshot de l'état géométrique (~10-20 Ko par snapshot pour une construction typique). 100 snapshots ≈ 1-2 Mo en IndexedDB — négligeable. **Contenu du snapshot** : `points`, `segments`, `circles`, `gridSizeMm`, `snapEnabled`, `activeTool`, `displayMode`, `displayUnit`, `consigne`, `selectedElementId`. Les propriétés détectées (`detectedAngles`, `detectedProperties`, figures fermées) ne sont **PAS sérialisées** — elles sont recalculées au restore (déterministes depuis l'état géométrique, <1ms pour <50 segments). L'approche snapshot est retenue pour sa simplicité et sa fiabilité (pas de bugs de « replay » de commandes inverses). Le debounce de 2s sur la sauvegarde IndexedDB ne sérialise que le snapshot courant, pas tout l'historique à chaque action.

- Chaque action modifiant l'état géométrique est enregistrée dans l'historique
- Profondeur : 100 niveaux (un enfant TDC qui ajuste et réajuste un même point peut consommer 50 niveaux en quelques minutes)
- Ctrl+Z retire la dernière action, Ctrl+Y la rétablit
- Toute nouvelle action après un undo efface la pile de redo (comportement standard)
- "Nouvelle construction" est une action unique dans l'historique (annulable d'un seul Ctrl+Z — restaure l'état depuis la **mémoire volatile JavaScript**, pas depuis IndexedDB). Si le navigateur est fermé après « Nouvelle construction », le Ctrl+Z n'est plus disponible — mais l'ancienne construction reste accessible dans son créneau « Mes constructions ». **Le créneau sauvegardé n'est PAS supprimé par le Ctrl+Z** — l'enfant se retrouve avec la construction restaurée comme active ET la copie dans ses créneaux. Aucune perte de données.

**Granularité des étapes undo :**

| Action | Nombre d'étapes undo |
|--------|---------------------|
| Placer un point libre | 1 |
| Créer un segment (crée 0-2 points + 1 segment) | 1 (atomique) |
| Chaînage : chaque segment de la chaîne | 1 par segment |
| Déplacement d'un point (pick-up → put-down) | 1 (position initiale → position finale uniquement, pas les intermédiaires) |
| Fixer une longueur | 1 (séparée de la création du segment) |
| Verrouiller/déverrouiller un point | 1 |
| Supprimer un élément (+ cascade) | 1 (atomique — undo restaure tout) |
| Réflexion complète (axe + copies) | 1 (atomique) |
| Créer un cercle | 1 |

**Actions qui ne sont PAS dans l'historique undo :**
- Changements de paramètres : mode d'affichage, unité d'affichage, taille de grille, taille de police, toggle sons, toggle accrochage, toggle « Masquer les propriétés »
- Zoom et pan du canevas
- Sauvegarde/chargement de constructions

---

## 16. Cas d'usage détaillés (scénarios de test)

### 16.1 Construire un carré de 4 cm
1. Sélectionner l'outil Segment
2. Cliquer sur le canevas → point A
3. Tirer vers la droite, la longueur affiche "4,0 cm" → cliquer → point B, segment AB créé
4. Depuis B, tirer vers le bas, le guide de perpendicularité apparaît (vert), longueur "4,0 cm" → cliquer → point C
5. Depuis C, tirer vers la gauche, le guide de parallélisme avec AB apparaît, longueur "4,0 cm" → cliquer → point D
6. Depuis D, tirer vers A, le snap au point A s'active → cliquer sur A → figure fermée
7. Le panneau affiche : "Carré détecté", 4 côtés de 4,0 cm, 4 angles droits, 2 paires de côtés parallèles
8. Clic sur Imprimer → PDF généré avec le carré propre, à l'échelle, mesurable à la règle

### 16.2 Construire une figure avec un angle obtus et des côtés parallèles
1. Tracer un premier segment AB horizontal de 5 cm
2. Depuis B, tracer BC vers le haut-droite. L'angle en B s'affiche en temps réel : "72° aigu"
3. L'enfant constate que c'est aigu, pas obtus. Il veut obtus. Il utilise l'outil Déplacer sur C et le repositionne jusqu'à ce que l'angle en B affiche >90° (ex : "110° obtus"). L'enfant vérifie visuellement et dans le panneau.
4. Depuis C, tracer un segment CD vers la gauche. Le guide de parallélisme avec AB apparaît (pointillé vert + bulle « parallèle à AB ») quand l'orientation s'approche de celle d'AB. L'enfant ajuste la longueur.
5. Fermer la figure en reliant D à A.
6. Le panneau affiche : "1 paire de côtés parallèles (AB // CD)", angles listés avec classifications.

### 16.3 Tracer un triangle rectangle isocèle dont les côtés de l'angle droit mesurent 3 cm
1. Tracer un segment AB horizontal de 3 cm
2. Depuis A, l'outil détecte que le guide perpendiculaire est disponible → tirer vers le haut, le guide de perpendicularité apparaît → tracer AC de 3 cm vers le haut
3. Fermer en cliquant B → triangle fermé
4. Le panneau affiche : "Triangle rectangle isocèle", angle droit en A, côtés de l'angle droit de 3 cm, troisième côté ~4,2 cm

### 16.4 Placer des points dans le plan cartésien
1. Activer le mode Plan cartésien (via un menu ou un bouton dédié)
2. Les axes x et y apparaissent avec graduation
3. L'enfant place des points en cliquant, le snap s'accroche aux coordonnées entières
4. Les coordonnées s'affichent près de chaque point : "(2, 3)"
5. L'enfant peut tracer des segments entre les points pour former une figure

---

## 17. Gestion des erreurs et cas limites

- **Segment de longueur 0** : si le deuxième clic est au même endroit que le premier, le segment n'est pas créé. **Pas de message d'erreur rouge** — l'action est ignorée silencieusement. Si un feedback est nécessaire, afficher un message neutre et encourageant dans la barre de statut (ex. : « Clique un peu plus loin pour tracer un segment »). **Note de conception :** les messages d'erreur augmentent l'anxiété de performance chez l'enfant TDC, déjà en situation de compensation constante.
- **Distance minimale entre points** : si un nouveau point serait à < 2mm d'un point existant, le clic est interprété comme un clic sur le point existant (snap forcé). Prévient la création de micro-segments non intentionnels pendant le chaînage.
- **T-jonction (point sur le corps d'un segment)** : quand un point est créé sur un segment existant (via snap au milieu ou snap grille tombant sur le segment), le segment original est **automatiquement scindé en deux segments** partageant ce nouveau point. C'est nécessaire pour la cohérence topologique du graphe planaire (leftmost-turn). La scission est atomique avec la création du point dans l'historique undo.
- **Segments qui se croisent** : autorisés (pas de restriction). La figure peut être non convexe.
- **Segments dupliqués** : si un segment AB existe déjà (mêmes deux extrémités), un deuxième segment AB n'est pas créé — le clic snap au point existant et le segment fantôme disparaît. Pas de message d'erreur.
- **Plus de 26 points** : après Z, la séquence continue avec **AA, AB, AC...** (pas A', B', C' — la notation prime est **réservée exclusivement à la réflexion**, §6.6). Les étiquettes supprimées ne sont **pas** recyclées (évite la confusion si l'enfant a noté « Point E » sur son cahier et qu'un nouveau point E apparaît à un autre endroit). La séquence d'étiquettes est propre à chaque construction. **Deux systèmes d'étiquetage distincts :** (1) séquence de création : A, B, C..., Z, AA, AB...; (2) réflexion : A' → A'' du point source. Si A est supprimé mais A' (son reflet) existe, A' garde son nom. Un nouveau point créé reçoit la prochaine lettre de la séquence, pas A.
- **Figure trop grande pour le PDF** : afficher un avertissement dans le dialogue d'impression (§12.5) : « Ta figure dépasse la feuille. Change l'orientation ou réduis la taille. » L'export reste possible (la figure est **coupée** aux marges). **Pas d'option de mise à l'échelle automatique** — cela violerait la garantie 1:1. Le toggle portrait/paysage du dialogue d'impression est mis en surbrillance comme suggestion.
- **Figure excentrée** : si le bounding box de la construction est décalé de plus de 60% par rapport au centre de la zone imprimable, afficher dans le dialogue d'impression : « Ta figure est près du bord de la page. » avec un bouton « Recentrer sur la page ». Le recentrage translate toute la construction pour centrer le bounding box dans la zone imprimable. C'est une opération dans l'historique undo (annulable).
- **Navigateur non supporté** : afficher un message invitant à utiliser Chrome, Edge ou Firefox récent
- **Pas d'internet** : une fois chargée, l'app fonctionne hors ligne grâce au Service Worker (voir §4.1.2)
- **IndexedDB indisponible** : si IndexedDB n'est pas disponible (mode privé sur certains navigateurs anciens), fallback silencieux vers localStorage. Afficher un avertissement discret si les deux sont indisponibles. Ne jamais bloquer l'utilisation de l'outil. **Cas fréquent — Chromebook en session éphémère** : ~80% des CSS québécois utilisent la gestion centralisée Google Admin sur les Chromebooks. Certaines politiques configurent les Chromebooks en **session invité ou session éphémère**, où IndexedDB est disponible pendant la session mais effacé à la déconnexion. Dans ce cas, IndexedDB fonctionne normalement mais les données ne persistent pas entre les sessions. La détection Deep Freeze (§17.1) couvre partiellement ce scénario. **Si IndexedDB et localStorage sont tous deux indisponibles** (rare mais possible en mode invité strict), l'outil fonctionne sans persistance — afficher un avertissement permanent dans le header : « Sauvegarde non disponible sur cet ordinateur. Exporte ta figure (.tracevite) avant de fermer. » avec un bouton d'export direct. Le bouton d'export `.tracevite` reste toujours fonctionnel (il génère un fichier téléchargeable sans dépendre d'IndexedDB).

### 17.1 Persistance locale (IndexedDB)
- La construction en cours est sauvegardée automatiquement en IndexedDB après chaque action (debounce de 2 secondes). Le debounce garantit que la sauvegarde capture un état **complet** (pas un état intermédiaire comme un déplacement en cours). L'historique undo/redo est sérialisé avec la construction (limité aux **100 dernières étapes**, cohérent avec la profondeur de 100 niveaux en mémoire — §15).
- **Sauvegarde aussi déclenchée sur l'événement `beforeunload`** — un enfant qui ferme accidentellement le navigateur ou l'onglet ne doit rien perdre. **Dialogue de confirmation avant fermeture** : activer `onbeforeunload` pour afficher le dialogue natif du navigateur (« Voulez-vous quitter cette page? »). Même si la sauvegarde automatique protège les données, l'enfant ne le sait pas — un onglet fermé accidentellement (Ctrl+W au lieu de Ctrl+Z, erreur de coordination motrice fréquente chez les TDC) est source de frustration. Le dialogue est une barrière de sécurité. Le dialogue n'est activé que si la construction contient au moins un élément (pas sur un canevas vide).
- **Indicateur visuel de sauvegarde** : une **icône de coche persistante** (✓) est affichée à côté du nom de la construction dans le header. L'icône est toujours visible quand la sauvegarde est à jour (couleur gris moyen, 14px). Pendant la sauvegarde (debounce en cours ou écriture IndexedDB), l'icône est remplacée par une animation de rotation discrète (spinner 14px, gris). Ce pattern (similaire à Google Docs « Toutes les modifications sont enregistrées ») offre une **réassurance continue** sans action requise. Les enfants TDC qui ont vécu des pertes de travail (fréquent avec Deep Freeze ou fermeture accidentelle) ont besoin de cette réassurance permanente — un indicateur transitoire de 2 secondes passe inaperçu chez les enfants avec difficultés d'attention. L'indicateur est non-interactif.
- Au chargement de l'application, la dernière construction active est restaurée automatiquement (avec son historique undo/redo)
- **Créneaux de sauvegarde multiples** : l'utilisateur peut nommer et sauvegarder plusieurs constructions (liste « Mes constructions »). Permet le partage de poste — fréquent en milieu scolaire où deux enfants utilisent le même laptop.

**Cycle de vie des constructions :**
- La première action de l'utilisateur (placer un point) crée automatiquement un créneau nommé « Construction 1 » (numéro incrémenté). La construction est toujours dans un créneau — il n'y a pas d'état « non sauvegardé ».
- L'auto-save (debounce 2s) sauvegarde dans le créneau courant.
- **Changer de construction** (ouvrir une autre depuis « Mes constructions ») auto-sauvegarde d'abord la construction courante dans son créneau, puis charge la nouvelle. L'historique undo/redo de la construction chargée est restauré.
- **Nouvelle construction** (barre inférieure ou dialogue « Mes constructions ») auto-sauvegarde la construction courante, puis crée un nouveau créneau vide avec un nom auto-généré.
- La construction courante **compte dans la limite de 50 créneaux**.
- La miniature est une capture SVG réduite du canevas (ratio fixe, fond blanc, même rendu que le canevas mais sans grille).

- **Flux « Mes constructions »** : un bouton « Mes constructions » dans le header ouvre un panneau/dialogue listant toutes les constructions sauvegardées avec :
  - Nom (éditable par clic), date de dernière modification, miniature de la figure
  - Boutons : Ouvrir, Renommer, Exporter (.tracevite), Supprimer (avec confirmation)
  - Bouton « Nouvelle construction » en haut de la liste
  - La construction en cours est marquée visuellement (bordure bleue)
  - Maximum 50 créneaux (suffisant pour une année scolaire complète). Si la limite est atteinte, message « Exporte ou supprime une construction pour en créer une nouvelle ». Rappel d'export à 45 créneaux.
  - Importer un fichier `.tracevite` crée un nouveau créneau (si < 20). Le nom du créneau est celui du fichier.
- La sauvegarde inclut : tous les points, segments, cercles, figures réfléchies, paramètres (niveau, unité, grille, taille police, sons, propriétés visibles), et l'historique undo/redo
- **Détection d'effacement IndexedDB** : stocker le flag « déjà lancé » dans IndexedDB **ET** localStorage (redondance — Deep Freeze n'efface pas toujours les deux). Au démarrage : si IndexedDB est vide ET localStorage a le flag → effacement Deep Freeze → afficher : « Tes constructions ont été effacées par l'ordinateur. Si tu as exporté tes fichiers .tracevite, clique "Ouvrir" pour les retrouver. » Si les deux sont vides → premier lancement (tutoriel). Si IndexedDB a des données → restauration normale. Ce scénario est fréquent dans les CSS québécois qui utilisent Deep Freeze.
- **Rappel d'export** : les services IT scolaires nettoient régulièrement le stockage local des navigateurs (politiques GPO, Deep Freeze). Afficher un rappel discret tous les 7 jours calendaires depuis le dernier export `.tracevite` (bandeau fin, non bloquant) : « Pense à sauvegarder ta figure dans ton dossier! » avec bouton direct d'export `.tracevite`. Le rappel n'apparaît que s'il y a des constructions non exportées. Option « Ne plus rappeler » disponible. Si l'API File System Access est disponible, proposer l'auto-export vers le dossier Téléchargements.

### 17.2 Export / import de fichier
- Bouton « Enregistrer sous... » permettant d'exporter la construction en fichier JSON (extension `.tracevite`). **Libellé dans l'interface : « Enregistrer un fichier »** (pas « Exporter .tracevite » — l'extension technique est invisible pour l'enfant)
- Bouton « Ouvrir un fichier » permettant d'importer un fichier `.tracevite`. **Ne pas afficher l'extension `.tracevite` dans le libellé** — le filtre du dialogue natif du navigateur restreint aux bons fichiers.
- **Pourquoi** : c'est la solution la plus robuste pour la portabilité. L'enfant peut sauvegarder sur sa clé USB, son dossier OneDrive/Google Drive scolaire, ou transférer entre deux postes. Élimine les risques liés au nettoyage automatique du navigateur par l'IT scolaire.

**Format du fichier `.tracevite` :**
- JSON avec un champ `version` (entier) à la racine. La version courante est **2**. La version 1 utilisait `schoolLevel` (valeur `'2e_cycle'` | `'3e_cycle'`) ; la version 2 utilise `displayMode` (valeur `'simplifie'` | `'complet'`). La migration v1→v2 est automatique et silencieuse à l'import.
- Champs requis : `version`, `points`, `segments`, `circles`, `settings` (displayMode, unité, grille).
- Champ optionnel : `consigne` (string, max 1000 caractères). Texte de l'instruction d'exercice défini par l'enseignant (voir §8.0.1). Si présent, affiché dans le bandeau de consigne à l'ouverture du fichier. Si absent ou chaîne vide, aucun bandeau.
- L'historique undo/redo est **exclu** de l'export (l'import démarre avec un historique vide). Cela simplifie drastiquement la migration de schéma entre versions (migrer 1 état courant vs. 100 snapshots) et réduit la taille du fichier (~20 Ko au lieu de ~2 Mo). L'import est une action délibérée qui marque un « nouveau départ » — la perte de l'undo est acceptable.
- Limite : maximum 500 éléments (points + segments + cercles) **à l'import uniquement** (garde-fou contre les fichiers anormalement gros). Pas de limite en temps réel pendant la construction — la performance se dégrade naturellement au-delà de ~100-200 éléments (§20).

**Validation à l'import :**
- JSON malformé → message en français : « Ce fichier ne peut pas être ouvert. Vérifie que c'est bien un fichier .tracevite. »
- Champs requis manquants → même message.
- Champs inconnus (version future) → ignorés silencieusement (forward-compatible).
- **Version inférieure** à celle de l'application → **migration automatique silencieuse**. Les champs manquants sont remplis avec des valeurs par défaut. Le fichier est sauvegardé en version courante dans IndexedDB. Les migrations sont séquentielles (v1→v2→v3). Le code de migration est une fonction pure `migrate(data, fromVersion, toVersion)` dans `persistence.ts`.
- Version supérieure à celle de l'application → message : « Ce fichier a été créé avec une version plus récente de TraceVite. Mets à jour l'application pour l'ouvrir. »
- Coordonnées hors zone visible → acceptées, le canevas est automatiquement pané/zoomé pour inclure tous les éléments.
- L'import crée un nouveau créneau dans « Mes constructions » (si la limite de 50 n'est pas atteinte).

### 17.3 Export / import de profil de paramètres

**Pourquoi :** en classe, l'enseignant ou le professionnel accompagnateur configure les paramètres de l'outil pour chaque élève TDC (mode d'affichage, tolérance large/très large, sons activés, taille de police, timeout de chaînage, etc.). Sans export de profil, cette configuration doit être refaite manuellement sur chaque poste ou après chaque effacement Deep Freeze.

- Bouton « Exporter les paramètres » / « Importer les paramètres » dans le panneau Paramètres
- Fichier JSON, extension `.tracevite-config`
- Contient : mode d'affichage (Simplifié/Complet), profil de tolérance, sons off/réduits/complets, taille de police, timeout de chaînage, raccourcis clavier on/off, unité d'affichage, taille de grille par défaut
- Ne contient **pas** de constructions ni d'historique
- L'import remplace les paramètres actuels (avec confirmation)

---

## 18. Ce que l'outil NE fait PAS (hors scope explicite)

- Pas de mode exercice/évaluation interactif (l'outil ne pose pas de questions, ne corrige pas, ne valide pas la construction). Le champ `consigne` (§8.0.1) permet d'afficher passivement une instruction de l'enseignant, mais l'outil ne vérifie pas si l'enfant a correctement réalisé la consigne
- Pas de sauvegarde en ligne (pas de comptes, pas de login)
- Pas de collaboration temps réel
- Pas de reconnaissance de l'écriture manuscrite
- Pas de tutoriel intégré au-delà du tutoriel interactif du premier lancement (voir §19 MVP item 23)
- Pas de contenu audio (narration, musique). Seuls trois micro-sons optionnels de feedback sont disponibles : snap, création de segment, fermeture de figure (voir §7.2)
- Pas de développement de solides en 3D (version 1)
- Pas de translation (version 1 — à ajouter en v2). La réflexion est dans le MVP.
- Pas de plan cartésien (version 1 — à ajouter en v2)

---

## 19. Priorités de développement (MVP → v2)

### Jalons internes du MVP

Le MVP est développé en 3 jalons itératifs :

**Jalon A — Canevas fonctionnel** (le « terrain de jeu » de base) :
- Items MVP : 1 (grille), 2 (segment + snap grille/points + chaînage + saisie longueur), 6 (longueurs temps réel), 8 (sélecteur niveau), 15 (undo/redo snapshots)
- Ajouts techniques : IndexedDB auto-save (créneau unique), seuil de drag 1,5mm, barre de statut contextuelle, zoom/pan + boutons navigation

**Jalon B — Construction complète** (l'outil de géométrie) :
- Items MVP : 3 (déplacer), 4 (cercle), 5 (réflexion), 7 (angles), 9-10 (détection/snap propriétés), 11 (mesurer/fixer), 12 (panneau latéral), 13 (sélection + barre contextuelle), 16 (figures fermées), 18 (surcharge visuelle)
- Snap complet (tous niveaux), toggle « Masquer les propriétés »

**Jalon C — Production et distribution** (prêt pour la classe) :
- Items MVP : 14 (PDF 1:1), 17 (IndexedDB créneaux multiples), 19 (.tracevite), 20 (PWA/SW), 21 (panneau escamotable), 22 (impression CSS), 23 (tutoriel), 24-25 (consigne + URL)
- Ajouts : export/import .tracevite-config, sons optionnels (Web Audio)

### MVP (version 1) — Le minimum pour être utile en classe à travers tout le primaire
1. Canevas avec grille (5 mm, 1 cm ou 2 cm)
2. Outil Segment avec snap aux points et à la grille, début de segment depuis un point existant, saisie de longueur inline, chaînage explicite
3. Outil Déplacer
4. Outil Cercle (rayon, diamètre) — nécessaire au 3e cycle
5. Outil Réflexion par rapport à un axe — nécessaire au 2e cycle
6. Affichage temps réel des longueurs (cm ou mm, configurable)
7. Affichage temps réel des angles avec classification (aigu/droit/obtus) ; mesure en degrés en mode 3e cycle
8. Sélecteur de mode d'affichage (Simplifié / Complet) pour adapter l'information et les outils visibles
9. Détection de parallélisme et perpendicularité (affichage dans le panneau)
10. Snap de parallélisme et perpendicularité (guides visuels pendant la construction)
11. Outil Longueur (fixer une longueur exacte) + saisie rapide après création de segment
12. Panneau latéral avec segments, angles, propriétés
13. Sélection par clic simple + barre d'actions contextuelle (pas de clic droit)
14. Export PDF à l'échelle 1:1 avec dialogue d'instructions d'impression
15. Undo/Redo
16. Détection et nommage des figures fermées
17. Sauvegarde locale automatique (IndexedDB) avec créneaux multiples pour ne pas perdre le travail
18. Gestion de la surcharge visuelle (mesures d'angle au survol quand >5/6 segments selon le cycle)
19. Export/import de fichier `.tracevite` (JSON) pour la portabilité entre postes
20. PWA avec Service Worker pour le fonctionnement hors-ligne
21. Panneau latéral escamotable pour les petits écrans
22. Impression directe via CSS (`window.print()`) en plus de l'export PDF
23. Overlay de bienvenue au premier lancement : tutoriel **par l'action** (semi-bloquant). L'overlay est centré sur le canevas (fond semi-transparent) et avance automatiquement quand l'enfant exécute l'action décrite :
    - **Étape 1** : « Clique sur la grille pour placer un point. » (Le mot « canevas » est inconnu des enfants de 8 ans — test utilisateur confirmé.) L'overlay utilise `pointer-events: none` — les clics passent au canevas. L'enfant peut cliquer **n'importe où** sur le canevas (pas de spotlight restrictif — un enfant TDC ne clique pas toujours là où on attend). L'étape avance quand le **résultat** est atteint (point placé), indépendamment de la position. Quand un point est placé, l'étape 2 apparaît automatiquement.
    - **Étape 2** : « Clique encore pour tracer un segment. » Quand un segment est créé, l'étape 3 apparaît.
    - **Étape 3** : « Oups? Appuie Ctrl+Z ou clique "Annuler" pour revenir en arrière. » Le message adapte le raccourci au device détecté (Cmd+Z sur macOS/iOS, Ctrl+Z ailleurs). L'étape accepte soit le raccourci clavier, soit un clic sur le bouton « Annuler » de la barre d'actions comme validation. L'undo est le filet de sécurité le plus important — ne pas l'introduire au tutoriel laisse l'enfant sans recours à la première erreur.
    - **Étape 4** : « C'est tout! Tu sais construire. » avec bouton « Commencer ».
    - **Après le tutoriel** : si aucune consigne n'est présente, afficher un **message central semi-transparent** sur le canevas vide : « Clique n'importe où pour commencer! » (police 18px, couleur gris moyen, `pointer-events: none`). Le message disparaît au premier clic sur le canevas. **Note de conception :** pour un enfant TDC avec des difficultés d'initiation de tâche (très fréquent), un canevas vide est paralysant. La barre de statut guide déjà l'enfant, mais c'est du texte périphérique — le message central agit comme un pont entre le tutoriel et l'autonomie.
    **Implémentation de l'overlay** : le fond semi-transparent est `pointer-events: none`. Le texte d'instruction est dans un bandeau en bas du canevas avec `pointer-events: auto`. Le bouton « Passer » est dans un conteneur séparé en haut à droite avec `pointer-events: auto`. Seuls ces deux éléments interactifs capturent les clics; le reste de l'overlay laisse passer.
    Un bouton « Passer » est disponible à chaque étape pour les enfants déjà familiers. **Si un paramètre URL `?consigne=` est présent au premier lancement**, le tutoriel s'affiche d'abord (4 étapes, ~20s), puis la consigne apparaît dans son bandeau après complétion ou « Passer ». La détection « premier lancement » est un flag booléen dans IndexedDB. Le panneau latéral est **fermé par défaut au premier lancement** et reste fermé jusqu'à ce que l'enfant l'ouvre. **Note de conception :** un tutoriel par l'action est plus efficace qu'un tutoriel par la lecture pour les profils TDC+TDAH (~50% de comorbidité). L'enfant vit l'instruction plutôt que de la lire. L'introduction progressive réduit la surcharge de choix.
24. Bandeau de consigne d'exercice : affichage d'une instruction textuelle optionnelle définie par l'enseignant (via fichier `.tracevite` ou paramètre URL). Voir §8.0.1
25. Paramètres URL (`?consigne=`, `?level=`) pour le partage de liens d'exercice via plateformes scolaires (Google Classroom, Teams). Voir §8.0.2

### Version 2

**Priorité haute (compétences PFEQ du 2e cycle non couvertes par le MVP) :**
- ~~Outil « Reproduire »~~ — **implémenté** : dupliquer une figure existante (sélection par flood-fill ou figure fermée, placement par clic).
- Vérification d'axe de symétrie : tracer un axe sur une figure existante et vérifier si la figure est symétrique par rapport à cet axe (« Combien d'axes de symétrie a ce carré? »). Compétence PFEQ **2e cycle**.
- ~~Panneau latéral repositionnable à gauche~~ — **implémenté** : toggle « À droite / À gauche » dans les Paramètres. Accommodation pour gauchers.

**Outils de construction avancés :**
- ~~Outils Perpendiculaire et Parallèle dédiés~~ — **implémentés** (mode Complet uniquement).
- ~~Translation par flèche de translation~~ — **implémenté** (mode Complet uniquement, compétence PFEQ 3e cycle).
- ~~Mode Plan cartésien~~ — **implémenté** (1er quadrant et 4 quadrants, dans les Paramètres).
- Production de frises et dallages

**Personnalisation :**
- ~~Couleur personnalisable des segments~~ — **implémenté** : 4 options (bleu #185FA5 par défaut, vert #0F6E56, violet #6D28D9, orange foncé #C24B22 — tous WCAG AA sur fond blanc). Sauvegardé dans les préférences localStorage. Donne un sentiment de propriété psychologique : « c'est MON outil, avec MA couleur ».

**Pédagogie et évaluation :**
- ~~Mode "estimation"~~ — **implémenté** : mesures masquées, bouton pour révéler (activable dans les Paramètres).
- Affichage de la formule d'aire utilisée (base × hauteur, etc.) pour renforcer l'apprentissage. Affichage de la **hauteur** d'un triangle ou parallélogramme pour soutenir le calcul de l'aire (vocabulaire PFEQ 3e cycle).
- ~~Export PDF avec/sans mesures~~ — **implémenté** : toggle « Inclure les mesures » dans le dialogue d'impression.
- Comparaison de figures isométriques (superposition par translation)
- ~~Choix de format de page A4 / Lettre US~~ — **implémenté** dans le dialogue d'impression.

**Enseignement et projection :**
- Mode « démonstration » pour TBI/projecteur : un bouton plein écran (ou F11) qui masque le header, réduit la toolbar au minimum, et maximise le canevas. Facteur de police amplifié (×2.0) pour la lisibilité en projection. Essentiel pour l'adoption par les enseignants qui démontrent les constructions au groupe-classe.
- Association du fichier `.tracevite` via le Web App Manifest (`file_handlers`) : sur les Chromebooks et Windows récents, cliquer sur un fichier `.tracevite` ouvre automatiquement TraceVite (si installé comme PWA).

**Accommodements TDC avancés :**
- Support tablette tactile optimisé avec stylet (iPad + Apple Pencil). Le stylet est souvent plus accessible que la souris pour les enfants TDC — plus proche du geste naturel de pointage. (Note : le MVP supporte déjà le stylet via `PointerEvent`, mais des optimisations tactiles — cibles 48px, rejection de paume — sont prévues ici.)
- ~~Mode contraste élevé~~ — **implémenté** (dans les préférences utilisateur).
- Gestion de la fatigue : rappel discret de pause après 20-30 min d'utilisation continue (les enfants TDC fatiguent plus vite sur les tâches motrices fines). Dans le MVP, le temps d'utilisation continue est affiché discrètement dans le footer (horloge) pour la conscience du temps — le rappel actif est v2.
- ~~Filtre de lissage du curseur~~ — **implémenté** : moyennage mobile sur 5 positions, activé automatiquement en profil « Tolérance très large ». Désactivable.
- ~~Mode « pas à pas » pour la réflexion~~ — **implémenté** : animation point par point avec pied de perpendiculaire (500ms par étape).

### Version 2bis (post-v2, avant v3)

**Dialogue « À propos »** : accessible via le numéro de version dans le footer (clic ou tap). Dialogue modal (même style que PrintDialog — fond semi-transparent, fermeture par × ou Escape). Contenu :

- **Logo** TraceVite (logo.svg) + nom de l'application
- **Version** : numéro de version (ex : « v1.2.3 »)
- **Vision** : « TraceVite est un outil de construction géométrique numérique pour les élèves du primaire ayant un Trouble Développemental de la Coordination (TDC). L'enfant fait le raisonnement, l'outil exécute le geste. »
- **Licence** : « Logiciel libre — licence open source avec attribution » + lien vers le texte complet de la licence dans le dépôt
- **Code source** : lien vers le dépôt GitHub (icône GitHub + URL)
- **Contact** : ma@tracevite.ca
- **Crédits** : « Conçu au Québec pour les enfants TDC et leurs enseignants. »

Le dialogue ne contient aucun lien externe de tracking, aucun analytics, aucun formulaire — cohérent avec le principe « pas de données sortantes ». Les liens (GitHub, licence) sont des `<a>` standards avec `target="_blank" rel="noopener"`.

### Version 3
- Développements de solides (3D → patron 2D)
- Import d'image de fond (scanner un exercice papier et construire par-dessus)
- Mode "gabarit rapide" pour les figures courantes (raccourci : carré de X cm)

---

## 20. Critères d'acceptation globaux

1. **Précision dimensionnelle** : un segment de 50mm à l'écran mesure 50mm ±0,5mm sur le PDF imprimé (sans mise à l'échelle d'impression)
2. **Performance** : le canevas reste fluide (60fps) avec jusqu'à 50 segments et 30 points (un dallage ou une exploration libre peut dépasser 20 segments facilement)
3. **Temps de construction** : un carré de 4 cm doit pouvoir être construit et imprimé en moins de 60 secondes par un utilisateur familier
4. **Accessibilité motrice** : aucune action ne nécessite une précision de clic inférieure à 5mm écran physique grâce au snap. Aucun clic droit requis.
5. **Langue** : interface entièrement en français (pas de termes anglais)
6. **Format numérique** : virgule décimale (pas de point), unité "cm" par défaut (mm disponible)
7. **Persistance** : la construction en cours est sauvegardée automatiquement en IndexedDB. Fermer et rouvrir le navigateur restaure le travail.
8. **Hors-ligne** : l'application fonctionne sans connexion internet après le premier chargement (Service Worker).
9. **Taille du bundle** : viser un bundle JavaScript + CSS gzippé **autour de 300 Ko** (hors cache Service Worker). C'est une cible de design, pas un critère bloquant — l'objectif est un chargement initial raisonnable sur une connexion scolaire typique (5 Mbps partagée entre 30 postes). Surveiller la taille du bundle pendant le développement et investiguer si elle dépasse significativement cette cible.

---

## 21. Notes techniques pour l'implémentation

### 21.1 Gestion du DPI écran, zoom et navigation
Le canevas doit fonctionner indépendamment de la résolution de l'écran. Les coordonnées internes sont en mm. Le facteur de zoom écran (combien de pixels écran par mm interne) est calculé dynamiquement. **La contrainte primaire est d'afficher une page Lettre portrait complète (~216mm × 279mm) dans le canevas visible au zoom par défaut.** Sur un Chromebook 11.6" (canevas ~1100px de large), cela donne ~51px/cm — ce qui est confortable (la grille de 1cm est bien espacée). Le plancher de lisibilité de la grille est de **25px par cm minimum** (en dessous, la grille est trop dense et les lignes fusionnent visuellement). Ce plancher n'est atteint qu'en zoom arrière significatif. L'utilisateur peut zoomer/dézoomer le canevas avec la molette de la souris, mais les coordonnées internes ne changent pas.

**Espace de construction** : borné à 2× la taille d'une page Lettre US dans chaque dimension (soit ~432mm × ~559mm). Cela permet de construire des figures plus grandes qu'une page tout en évitant un espace infini qui compliquerait la navigation. Le zoom par défaut affiche une zone correspondant à une page Lettre portrait (avec marges) dans le canevas visible. **Comportement aux limites :** si l'enfant tente de placer un point en dehors de l'espace de construction, le point est **snappé au bord** (pas ignoré silencieusement — l'absence de feedback est déroutante pour un TDC). Une bordure fine en pointillé gris apparaît aux limites quand le curseur s'en approche (à 10mm). La barre de statut affiche : « Tu as atteint le bord de la feuille. »

**Limites de zoom** : 50% à 200% du viewport. Le zoom par défaut est adapté à la taille de l'écran détectée : la vue initiale montre une page Lettre portrait complète. Zoomer à 200% permet un placement très précis; zoomer à 50% donne une vue d'ensemble.

**Tolérances de snap et zoom** : les tolérances de snap sont toujours en mm physiques à l'écran. Quand l'utilisateur zoome, la zone de snap en coordonnées internes (mm) diminue proportionnellement. Ainsi, **zoomer donne plus de précision** de placement (la zone de snap couvre moins d'espace géométrique). Les profils « Tolérance large » (×1.5) et « Tolérance très large » (×2.0) ne s'appliquent qu'aux tolérances de distance (pas à la tolérance d'angle de ±5°).

**Zoom et pan pendant une action en cours** : le zoom et le pan restent disponibles même quand une action est en cours (premier point d'un segment posé, point « ramassé » en mode Déplacer, axe de réflexion en cours de définition). L'enfant peut réaliser que la destination est hors écran après avoir posé le premier point — il doit pouvoir panner sans perdre son action. Le premier point (ou l'axe partiel) reste ancré dans les coordonnées internes et suit le pan/zoom.

**Zoom navigateur vs zoom interne** : Ctrl+molette déclenche le zoom du navigateur, pas le zoom interne du canevas. Le zoom interne est uniquement via la molette sans modificateur sur le canevas. Ne pas tenter d'intercepter le zoom navigateur — ça cause des conflits d'accessibilité.

**Densité visuelle de la grille** : si le zoom fait que les lignes de grille seraient espacées de < 10px à l'écran, n'afficher qu'une ligne sur deux (sous-échantillonnage). Si elles seraient espacées de > 60px, afficher des lignes de sous-grille intermédiaires en gris encore plus pâle. Cela garantit que la grille reste lisible à tous les niveaux de zoom.

**Pan (défilement)** : Si la construction dépasse la zone visible, plusieurs méthodes de pan sont disponibles, en cohérence avec le principe « pas de geste dual (maintien + mouvement) » :
1. **Boutons fléchés** (méthode par défaut, adaptée TDC) : 4 boutons fléchés (44×44px) **superposés** aux bords du canevas (haut, bas, gauche, droite) qui défilent le canevas par incréments d'un carreau dans les coordonnées internes (mm). Appui maintenu = défilement continu. Les boutons ne réduisent pas la zone de dessin. **Opacité adaptative** : **50% au repos** (test utilisateur : 20-30% est quasi-invisible pour les TDC, surtout les 8-9 ans), 80% au survol du bouton. Les boutons **capturent toujours les clics** dans tous les outils (la navigation prime sur la construction au bord du canevas). Pour placer un point sous un bouton, l'enfant panne d'abord pour éloigner la zone de travail du bord.
2. **Barres de défilement** : barres de défilement standard du navigateur, toujours visibles quand le contenu dépasse la zone visible.
3. **Clic-glissé sur le fond vide** (alternatif) : disponible uniquement en mode **Déplacer** (quand aucun point n'est sous le curseur) et **Longueur** (quand aucun segment n'est sous le curseur). **Non disponible en mode Segment/Point/Cercle** car clic-sur-fond = création de géométrie dans ces outils.
4. **Clic-molette drag** (middle-click) : disponible dans tous les outils comme raccourci power-user. Le bouton molette n'est pas utilisé par les enfants TDC mais peut l'être par l'enseignant ou l'accompagnateur.
5. **Shift+molette** : défilement horizontal (complément du défilement vertical par molette seule).
6. ~~Maintien barre d'espace + glissé~~ — **retiré** : c'est un geste dual (hold + move), en contradiction avec les principes TDC.

**Zoom** : En plus de la molette de souris, fournir des **boutons + et −** (44×44px) dans un coin du canevas (superposés semi-transparents, comme les boutons fléchés) pour les enfants qui n'ont pas de molette ou qui ont des difficultés avec ce geste.

**Quand le panneau latéral est replié**, le canevas s'étend pour occuper toute la largeur disponible.

**Redimensionnement de la fenêtre** : quand la fenêtre du navigateur est redimensionnée (ou un iPad pivoté), le canevas s'adapte à la nouvelle taille sans déplacer la construction. La position de la vue dans les coordonnées internes est conservée (comportement identique à Google Maps). Le canevas se re-dimensionne, pas la construction. **Scénarios de test tablette :**
- **Rotation pendant une action en cours** : si un iPad pivote pendant qu'un point est « ramassé » (mode Déplacer) ou qu'un premier point de segment est posé, l'action reste active. Le point ramassé continue de suivre le curseur après la rotation. Le `pointermove` natif gère ce cas, mais tester explicitement.
- **Clavier virtuel** : quand le clavier virtuel apparaît (saisie de longueur, §6.1), le `visualViewport` se réduit. Le champ de saisie doit rester visible (repositionnement en haut du canevas si le clavier masque le bas — voir §6.1 étape 7). Quand le clavier se ferme, le layout revient à la normale sans perte de l'état de construction en cours.

### 21.2 Calcul d'angle entre deux segments

**Cas 1 — Segments libres (pas dans une figure fermée) :**
Retourner le plus petit angle entre les deux directions (toujours ≤ 180°).

```typescript
function angleBetweenFree(seg1: Segment, seg2: Segment, vertex: Point): number {
  const dx1 = otherEnd(seg1, vertex).x - vertex.x;
  const dy1 = otherEnd(seg1, vertex).y - vertex.y;
  const dx2 = otherEnd(seg2, vertex).x - vertex.x;
  const dy2 = otherEnd(seg2, vertex).y - vertex.y;
  const angle1 = Math.atan2(dy1, dx1);
  const angle2 = Math.atan2(dy2, dx2);
  let diff = angle2 - angle1;
  if (diff < 0) diff += 2 * Math.PI;
  return Math.min(diff, 2 * Math.PI - diff) * (180 / Math.PI);
}
```

**Cas 2 — Sommets d'une figure fermée (angle intérieur) :**
Pour un polygone fermé, utiliser l'ordre de parcours (winding order) et le produit vectoriel pour déterminer l'angle intérieur. **Détermination du winding order** : calculer l'aire signée via la formule du lacet (shoelace) sans valeur absolue. Si l'aire signée > 0, les sommets sont en sens anti-horaire (CCW); si < 0, en sens horaire (CW). C'est l'algorithme standard, indépendant de l'ordre de découverte BFS. Cela gère correctement les polygones concaves où un angle intérieur peut être > 180°.

```typescript
function interiorAngle(prev: Point, vertex: Point, next: Point, windingCCW: boolean): number {
  const dx1 = prev.x - vertex.x;
  const dy1 = prev.y - vertex.y;
  const dx2 = next.x - vertex.x;
  const dy2 = next.y - vertex.y;
  const cross = dx1 * dy2 - dy1 * dx2;
  const dot = dx1 * dx2 + dy1 * dy2;
  let angle = Math.atan2(Math.abs(cross), dot) * (180 / Math.PI);
  // Si le produit vectoriel indique que l'angle est du côté extérieur
  const isReflex = windingCCW ? cross > 0 : cross < 0;
  if (isReflex) angle = 360 - angle;
  return angle;
}
```

**Note :** pour les sommets d'une figure fermée, si 3+ segments se rejoignent au même point, on affiche seulement les angles entre paires de côtés adjacents dans le contour de la figure (pas toutes les combinaisons). Les angles entre segments libres au même sommet restent calculés avec `angleBetweenFree`.

**Cas 3 — 3+ segments libres au même point (pas dans une figure fermée) :**
Trier les segments par direction (atan2 depuis le sommet), puis afficher l'angle entre chaque paire **adjacente** par ordre angulaire. Pour 3 segments : 3 angles. Pour 4 segments : 4 angles. Ne PAS afficher toutes les combinaisons croisées (3 segments = 3 paires, pas 3; 4 segments = 4 paires, pas 6) — cela saturerait visuellement. Le seuil de surcharge visuelle (§8.2) s'applique normalement.

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
1. Générer le PDF **programmatiquement** avec jsPDF : tracer les lignes, cercles, arcs et texte directement via l'API jsPDF en utilisant les coordonnées internes (mm → unités PDF, facteur 2.835). Pas de conversion SVG→PDF intermédiaire.
2. Page Lettre US, marges 15mm. **La position de la figure relative à la page virtuelle est préservée** (pas de re-centrage). Le zoom par défaut montre une page Lettre → la zone visible correspond directement à la zone imprimable du PDF. Si la figure est en haut-gauche du canevas au zoom par défaut, elle apparaît en haut-gauche du PDF. Un re-centrage serait déroutant (« ma figure a bougé »). Les constructions qui dépassent la page sont coupées aux marges (pas de multi-pages dans le MVP).
3. Ajouter le segment-témoin de 5 cm en bas à droite
4. Ajouter la mention "TraceVite — Échelle 1:1" en bas à gauche en police 7pt grise
5. Configurer le viewer preference `/PrintScaling /None`
6. Déclencher le téléchargement du PDF. **Nom du fichier** : `{nom-du-créneau}.pdf` où les espaces sont remplacés par des tirets et les caractères spéciaux supprimés (ex. : créneau « Construction 1 » → `Construction-1.pdf`). Pas de date dans le nom — l'enfant ne sait pas quelle date chercher dans son dossier Téléchargements.

**Alternative : impression directe via CSS** : en plus du PDF, offrir un bouton « Imprimer directement » qui utilise `window.print()` avec une feuille CSS `@media print`. La feuille CSS doit :
- Masquer toute l'UI (toolbar, panneau latéral, barre de statut, barre d'actions)
- Afficher un **SVG d'impression dédié** (pas le SVG interactif) avec dimensions CSS en mm : `width="185.9mm" height="249.4mm"` et `viewBox="0 0 185.9 249.4"` (coordonnées en mm internes). Ce SVG est généré au moment du `window.print()` et inséré dans le DOM en `display: none` (visible uniquement en `@media print`). Les coordonnées mm du viewBox correspondent directement aux mm physiques sur papier, garantissant le 1:1.
- Convertir tous les traits en noir (pas de couleur)
- Masquer la grille (sauf si le toggle « grille sur le PDF » est activé — dans ce cas, grille en gris 10%)
- Conserver les étiquettes, mesures et marques conventionnelles (angles droits, parallélisme, congruence)
- Utiliser `@page { size: letter; margin: 15mm; }` (ou `@page { size: letter landscape; margin: 15mm; }` si paysage sélectionné) — **généré dynamiquement** au moment du `window.print()` selon le toggle orientation du dialogue TraceVite. Ne pas se fier au dialogue d'impression du navigateur pour l'orientation.
- Ajouter `break-inside: avoid` sur le conteneur SVG
**Le PDF est le chemin principal et garanti pour le 1:1.** L'impression directe CSS est « best effort » — le support de `@page { size: letter }` varie entre navigateurs (Chrome : ok, Firefox : partiel, Safari : variable). Le dialogue d'impression reflète cette hiérarchie (PDF = bouton proéminent bleu, impression directe = secondaire). Une note dans le dialogue (masquable) : « L'impression directe peut varier selon le navigateur. Pour une échelle garantie, utilise le PDF. » **Sur Firefox** (détecté via `navigator.userAgent`), remplacer par un message plus direct : « Firefox ne supporte pas bien l'impression à l'échelle. Utilise "Télécharger le PDF". »

### 21.6 Tests et intégration continue

**Tests unitaires** (Vitest) :
- `engine/geometry.ts` : distances, angles, intersections — logique pure, couverture complète
- `engine/snap.ts` : chaque type de snap avec cas limites (deux points à égale distance, etc.)
- `engine/properties.ts` : détection de parallélisme, perpendicularité, classification des figures
- `engine/pdf-export.ts` : vérifier que les dimensions dans le PDF correspondent aux dimensions internes. **Test automatisé** : un segment de 50mm interne doit produire des coordonnées espacées de `50 × 2.835 = 141.75` unités PDF (±0.01). **Test physique manuel** : imprimer le PDF sur imprimante laser N&B, mesurer à la règle — documenté dans une checklist de release, pas automatisable en CI.

**Tests d'intégration** :
- Scénarios de construction complets (§16) : carré de 4 cm, triangle rectangle isocèle, etc.
- Undo/redo sur séquences d'actions
- Sauvegarde/restauration IndexedDB

**CI** : GitHub Actions — build + lint + tests à chaque push/PR.

### 21.7 Versioning et maintenance

- **Numéro de version visible** : affiché discrètement dans le footer (ex : « v1.2.3 »). Quand un enseignant signale un bug, on sait quelle version il utilise.
- **Licence** : MIT. Contact : ma@tracevite.ca

---

## Annexe A — Vocabulaire géométrique PFEQ à afficher

L'outil doit utiliser exactement le vocabulaire prescrit par le programme :

| Terme | Contexte d'utilisation |
|-------|----------------------|
| Point | Quand il est libre (pas partie d'une figure fermée). Ex : « Point A » |
| Sommet | Quand il est partie d'une figure fermée. Ex : « Sommet A ». **Ne pas appeler « point » un sommet de figure.** |
| Segment | Quand il est libre (pas partie d'une figure fermée). Ex : « Segment AB » |
| Côté | Quand il est partie d'une figure fermée. Ex : « Côté AB ». **Ne pas appeler « segment » un côté de figure.** |
| Angle aigu | Angle < 90° |
| Angle droit | Angle = 90° |
| Angle obtus | 90° < Angle < 180° |
| Angle plat | Angle = 180° — **3e cycle seulement**, masqué en 2e cycle |
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

### Intégration au Plan d'intervention (PI)

TraceVite peut constituer une **mesure d'adaptation** au sens de la Politique de l'adaptation scolaire du Québec. Il compense une limitation motrice sans modifier les compétences évaluées : l'élève est évalué sur les mêmes apprentissages géométriques que ses pairs.

**L'intégration au PI relève des professionnels de l'équipe-école** (enseignant(e), direction, et le cas échéant les professionnels impliqués dans le plan d'intervention). L'exemple ci-dessous est fourni à titre indicatif — il doit être adapté au contexte de chaque élève par les intervenants autorisés.

**Exemple de documentation dans le PI :**
1. **Besoin identifié** : difficulté de manipulation des instruments de géométrie (règle, compas, rapporteur) liée au TDC.
2. **Mesure d'adaptation** : utilisation de l'outil numérique TraceVite pour les activités de construction géométrique et les évaluations en géométrie et mesure.
3. **Modalités** : l'élève construit à l'écran et imprime sa figure à l'échelle 1:1. Le toggle « Masquer les propriétés » peut être activé lors des évaluations pour que l'élève identifie lui-même les propriétés géométriques.
4. **Responsable** : selon les pratiques de l'école.

**Pour l'évaluation ministérielle de mathématiques (6e année)** : l'utilisation de TraceVite comme mesure d'adaptation doit être documentée dans le PI et approuvée par la direction, conformément aux directives du ministère.

**Référence** : Loi sur l'instruction publique (LIP), articles 96.14 et 235; Politique de l'adaptation scolaire « Une école adaptée à tous ses élèves ».

### Préparer un exercice avec figure de départ

Pour distribuer un exercice qui inclut une figure pré-tracée (ex. : « Voici un triangle. Trace la perpendiculaire passant par le sommet A. »), l'enseignant doit :
1. Ouvrir TraceVite et construire la figure de départ
2. Exporter la construction en fichier `.tracevite` (bouton « Enregistrer sous... »). Le champ `consigne` du fichier peut contenir l'instruction d'exercice.
3. Déposer le fichier `.tracevite` sur la plateforme de partage de l'école (Google Drive, OneDrive, Teams, Google Classroom — en pièce jointe ou lien de téléchargement)
4. L'élève télécharge le fichier et l'ouvre dans TraceVite (bouton « Ouvrir... »). La figure et la consigne sont restaurées.

**Note :** le partage d'une figure de départ via un lien URL (sans fichier) n'est pas supporté dans la version actuelle. Pour les exercices sans figure de départ (consigne textuelle seulement), utiliser le lien URL avec le paramètre `?consigne=` (§8.0.2).

### Impression — Workflow recommandé

**Le chemin PDF est le workflow principal recommandé** pour garantir l'échelle 1:1. L'impression directe CSS (`window.print()`) est disponible comme alternative rapide mais son support varie entre navigateurs (Chrome : bon, Firefox : partiel, Safari : variable). En particulier, certaines **politiques d'impression (GPO)** configurées par les services IT scolaires forcent « Ajuster à la page » dans Chrome — cette GPO prime sur le choix de l'utilisateur dans le dialogue d'impression du navigateur. Le PDF avec la préférence `/PrintScaling /None` est plus résistant à ces politiques.

**Workflow typique en classe** (quand l'élève n'a pas accès à l'imprimante directement) :
1. L'élève clique « Imprimer » → « Télécharger le PDF »
2. L'élève dépose le PDF sur sa clé USB, Google Drive ou OneDrive scolaire
3. L'enseignant imprime le PDF depuis son poste, en vérifiant que l'option « Taille réelle / 100% » est sélectionnée
4. L'enseignant vérifie l'échelle avec le segment-témoin de 5 cm en bas à droite du PDF

### Pour le technicien de votre école

TraceVite est une application web statique hébergée sur un CDN. Voici les informations techniques pour autoriser l'accès :

- **Domaine à autoriser** dans le filtre de contenu (GoGuardian, Securly, ContentKeeper, etc.) : `tracevite.ca` (et ses sous-domaines éventuels)
- **Port** : HTTPS uniquement (443)
- **Données sortantes** : **aucune**. TraceVite ne collecte aucune donnée, n'envoie aucune requête après le chargement initial, ne contient aucun analytics ni tracking. Toutes les données restent dans le navigateur de l'élève (IndexedDB). Conforme à la Loi 25 du Québec.
- **Service Worker** : l'application utilise un Service Worker pour le fonctionnement hors-ligne. Si votre filtre de contenu bloque les Service Workers (certaines configurations de GoGuardian/Securly), l'application fonctionne normalement en mode « online only » — aucune fonctionnalité n'est perdue sauf le cache hors-ligne.
- **Stockage local** : l'application utilise IndexedDB (et localStorage comme fallback) pour sauvegarder les constructions de l'élève. Sur les postes avec Deep Freeze ou sessions éphémères, l'élève doit exporter ses fichiers `.tracevite` avant la fin de la session.
- **Taille de téléchargement** : ~300 Ko (gzippé, cible de design). Chargement rapide même sur WiFi scolaire partagé.

---

## Annexe C — Décisions fermées (ne pas rouvrir)

Les questions suivantes ont été posées, débattues et tranchées définitivement. Elles ne doivent pas être re-soulevées.

### Constantes d'accessibilité
- Toutes les valeurs d'accessibilité (seuil de drag 1,5mm, tolérances de snap 7/5/2mm, timeout chaînage 8s, seuil surcharge 5/6 segments, micro-confirmation 3s) sont des **estimations** stockées dans `accessibility-constants.ts`, configurables via `.tracevite-config`. On livre avec les estimations et on ajuste en production. Pas de protocole de validation formel dans le scope du projet.
- Le seuil de drag (1,5mm) est **unique** pour souris/tactile/stylet, non multiplié par le profil de tolérance, configurable 1,0-3,0mm.
- Le profil de tolérance ×1.0 est le défaut (adapté TDC légers-modérés, ~70% des cas).

### Interactions — règles de désambiguïsation
- **Drag > 1,5mm = déplacement** dans tous les outils, y compris pendant le chaînage (chaînage suspendu, reprend au relâchement).
- **Clic < 1,5mm = action contextuelle** de l'outil actif (nouveau segment, continuation chaîne, etc.).
- **Pan par clic-glissé** : uniquement en mode Déplacer/Longueur (fond vide). Pas en Segment/Point/Cercle.
- **Boutons de pan** : capturent toujours les clics, dans tous les outils. L'enfant panne d'abord.
- **Barre contextuelle** : centrée au-dessus du milieu du segment/point. Plus large que le segment = normal. Fallback en-dessous si hors canevas.

### Vocabulaire PFEQ
- Pas de « cathètes », pas d'« hypoténuse », pas de « rentrant » — tous hors programme primaire.
- « Concave » : pas de texte en 2e cycle (arc visuel seul), valeur numérique sans classification en 3e cycle.
- Classification triangles 2e cycle : **équilatéral > rectangle > isocèle > scalène** (une seule, la plus spécifique).
- Classification triangles 3e cycle : cumulative (« triangle rectangle isocèle »).
- « Points alignés » : uniquement pour 3 points connectés par segments formant ~180°, pas pour des points libres non connectés.

### Algorithmes
- Détection de figures : **leftmost-turn** (pas BFS), des deux côtés du nouveau segment. Faces < 1mm² ignorées.
- Re-détection à la suppression : **approche locale** (voisinage des extrémités).
- Auto-intersection segment-segment : **à la création uniquement** (pas au déplacement). Activée par défaut, désactivable dans les Paramètres.
- Auto-intersection : vérification **en temps réel** pendant le déplacement.
- Winding order : **signe de l'aire signée** (shoelace sans abs).

### PDF et impression
- **PDF = chemin garanti 1:1.** Impression CSS = best effort. Avertissement Firefox.
- Position de la figure : **préservée** (pas de recentrage automatique). Bouton « Recentrer » si excentrée.
- Segment-témoin 5cm : **position fixe** en bas-droite, gris pâle.
- Pas de multi-pages (MVP ni v2). Coupure aux marges.
- Espace de construction : **fixe 2× Lettre portrait**, indépendant de l'orientation d'impression.

### Persistance
- **50 créneaux** max. Rappel export à 45.
- Undo : **snapshots complets** (état géométrique seulement, propriétés recalculées au restore).
- Export .tracevite : **sans historique undo** (migration triviale, fichier ~20Ko).
- Deep Freeze : flag dans IndexedDB + localStorage. Heuristique, pas garanti 100%.
- Undo de « Nouvelle construction » : **mémoire volatile** (perdu à la fermeture du navigateur).
- URL ?consigne= : **crée un nouveau créneau**. Si plein : message.

### Sons
- 3 modes : **Off / Réduits / Complets**. Gain défaut 50%. Web Audio API synthèse.
- Debounce 150ms à l'entrée dans la zone de snap. Pas de design sonore spécialisé TSA.

### Interaction et feedback (ajouts revue multidisciplinaire)
- **Debounce clics canevas** : 150ms entre deux pointerdown consécutifs dans le même état machine. Ne s'applique pas aux boutons UI.
- **Indicateur de sauvegarde** : icône coche **persistante** dans le header (pattern Google Docs), pas un indicateur transitoire de 2 secondes.
- **Dialogue `beforeunload`** : activé dès qu'il y a au moins un élément sur le canevas. Protection contre la fermeture accidentelle (perte de travail).
- **Nom du fichier PDF** : `{nom-du-créneau}.pdf`, espaces→tirets. Pas de date.
- **`inputmode="decimal"`** : sur tous les champs de saisie numérique (longueur, rayon). Repositionnement en haut du canevas si clavier virtuel détecté.
- **Message post-tutoriel** : « Clique n'importe où pour commencer! » centré sur le canevas vide, disparaît au premier clic. Pont entre tutoriel et autonomie.
- **Indicateur Shift sur le curseur** : curseur CSS personnalisé quand la contrainte 15° est active. En plus de la barre de statut.
- **Toggle « Voir la hiérarchie »** : masqué par défaut même en 3e cycle. Activable par l'enseignant dans `.tracevite-config`.
- **Annotation « côtés de l'angle droit »** : dans le panneau latéral pour les triangles rectangles. Pas d'« hypoténuse ».
- **Pipe `|` dans URL consigne** : alias pour retour à la ligne, facilite la saisie enseignant.
- **Navigation clavier UI** : Tab/Entrée dans toolbar, panneau, dialogues au MVP (via éléments HTML sémantiques). Navigation clavier canevas SVG reste v2.

### Hors scope MVP (ne pas implémenter, ne pas architecturer pour)
- Calibrage DPI par l'utilisateur (v2)
- Profils utilisateur nommés dans l'app (v2)
- Seuil de drag par type de pointeur (v2 si nécessaire)
- ~~Pinch-to-zoom~~ — **implémenté** (2 doigts, rejection de paume à 3+ doigts)
- Navigation clavier dans le canevas SVG (v2)
- PDF multi-pages (v3)
- ~~Détection automatique d'intersections segment-segment~~ — **implémenté** (activé par défaut, désactivable dans les Paramètres)
- Mode démonstration TBI (v2)
- ~~Filtre de lissage du curseur~~ — **implémenté** (activé automatiquement en profil de tolérance « très large »)
- Hot-reload des constantes d'accessibilité
- Partage de figure de départ via URL (v2 — utiliser fichier .tracevite en attendant)
- Rappel actif de pause/fatigue (v2 — afficher l'heure courante dans le footer au MVP)

### Choix d'interface pour l'accessibilité TDC

Les décisions de conception suivantes visent à améliorer l'utilisabilité pour les enfants TDC :
- **« Nouvelle construction »** : texte complet obligatoire, jamais tronqué (§11)
- **« Ouvrir un fichier »** : pas d'extension `.tracevite` dans le libellé (§17.2)
- **« Clique ailleurs ou appuie Échap »** : remplace « Échappe pour terminer » dans toute la barre de statut
- **« Clique sur la grille »** : remplace « canevas » dans le tutoriel (§19)
- **« 🧲 Aimant »** : remplace « Accrochage » dans la toolbar (§10)
- **Boutons de pan : opacité 50% au repos** (20-30% quasi-invisible pour les 8-9 ans) (§21.1)
- **Avertissement impression : « IMPRIME À 100% » en gros + illustration** (§12.5)
- **Champ longueur : placeholder « Tape une longueur ou clique ailleurs »** (rôle du champ ambigu sans indication) (§6.1)
- **Annuler/Rétablir : fond bleu pâle sur Annuler** pour différencier visuellement (§11)
- **Supprimer contextuel : inclut le nom de l'élément** (« Supprimer le côté AB ») (§6.9)
