# GéoMolo

Règle, compas et rapporteur numériques pour les enfants du primaire qui ont du mal avec les vrais — notamment ceux qui vivent avec un TDC (trouble développemental de la coordination) ou une dyspraxie.

GéoMolo remplace les instruments physiques que certains enfants ne peuvent pas manipuler avec précision, tout en préservant la réflexion géométrique. L'enfant fait le raisonnement, l'outil exécute le geste.

**[geomolo.ca](https://geomolo.ca)**

## Pourquoi

Mon fils comprend la géométrie mais ne peut pas la tracer. La règle glisse, le compas dérape, la page se froisse. GéoMolo est la calculatrice de la géométrie : l'outil fait le geste à la place de la main.

L'outil suit le programme du primaire québécois (PFEQ), du 2e au 3e cycle (8-12 ans).

## Guide pour les enseignants et les parents

GéoMolo s'adapte aux besoins de chaque enfant grâce à des réglages accessibles via le bouton engrenage (paramètres). Voici les options à considérer selon le profil de l'élève.

### Mode d'affichage (Simplifié / Complet)

Le sélecteur en haut de l'écran contrôle le niveau d'information affiché :

- **Simplifié** (par défaut) : correspond au 2e cycle. Angles par classification seulement (aigu/droit/obtus), barre d'outils réduite aux essentiels (Segment, Déplacer, Réflexion + « Plus d'outils »), pas de cercle, pas de degrés.
- **Complet** : correspond au 3e cycle. Mesures en degrés, cercle, translation, plan cartésien, classification cumulative des triangles.

Choisir le mode selon le niveau scolaire de l'enfant, pas selon ses capacités motrices.

### Tolérance d'accrochage (snap)

Contrôle la zone dans laquelle un clic « accroche » automatiquement un point existant ou la grille :

- **Normal** : tolérance standard (7 mm pour les points, 5 mm pour la grille)
- **Large** (×1,5) : recommandé pour les plus jeunes (8-9 ans)
- **Très large** (×2,0) : quand l'enfant est souvent frustré par ses clics qui « manquent la cible »

En cas de doute, commencer par « Large » et ajuster selon les frustrations observées.

### Rétroaction sonore

Trois modes selon la sensibilité de l'enfant :

- **Désactivé** (par défaut) : aucun son
- **Réduit** : son à la création d'un segment et à la fermeture d'une figure seulement
- **Complet** : son d'accrochage (snap), de création et de fermeture

Le son aide l'enfant à savoir si son clic a fonctionné — surtout utile quand il ne « sent » pas bien ses gestes. Le volume est ajustable.

### Délai de chaînage

Quand l'élève trace des segments bout à bout, le chaînage s'arrête automatiquement après une période d'inactivité :

- **5 secondes** : pour les élèves rapides
- **8 secondes** (par défaut) : bon compromis
- **15 secondes** : pour les enfants qui ont besoin de plus de temps de planification
- **Désactivé** : le chaînage ne s'arrête jamais automatiquement (cliquer ailleurs ou Échap)

### Raccourcis clavier

**Désactivés par défaut.** Les raccourcis à une touche (S pour segment, C pour cercle, etc.) causent des changements d'outil accidentels quand les frappes manquent de précision. Activer uniquement si l'enfant ou l'enseignant en exprime le besoin.

### Taille du texte

Trois niveaux : 1× (par défaut), 1,25× et 1,5×. Augmenter si l'enfant doit se pencher pour lire les mesures sur le canevas.

### Autres réglages utiles

| Réglage | Où le trouver | Quand l'utiliser |
|---------|---------------|------------------|
| **Masquer les propriétés** | Panneau de droite (bouton oeil) | Évaluation : masque parallélisme, perpendicularité et marques de congruence, mais laisse les longueurs et angles visibles |
| **Mode estimation** | Paramètres | L'élève construit sans voir les mesures, puis les révèle pour vérifier |
| **Plan cartésien** | Paramètres (1 ou 4 quadrants) | Activités de repérage dans le plan |
| **Intersection auto** | Paramètres | Crée automatiquement un point quand deux segments se croisent (activé par défaut) |
| **Couleur des segments** | Paramètres | 4 couleurs au choix (WCAG AA) — utile pour différencier des constructions superposées |
| **Panneau à gauche** | Paramètres | Pour les élèves gauchers dont la main cache le panneau de droite |
| **Contraste élevé** | Paramètres | Renforce les contrastes pour les environnements lumineux (TBI, fenêtre) |

### Consigne d'exercice

L'enseignant peut transmettre une consigne via un fichier `.geomolo` préparé : la consigne s'affiche en bannière au-dessus du canvas. Pour les exercices avec figure de départ, utiliser le partage d'URL (`#s=...`) qui inclut automatiquement la consigne.

### Profils de paramètres

L'enseignant ou le parent peut exporter un fichier `.geomolo-config` contenant tous les réglages adaptés à un élève, puis l'importer sur un autre appareil (les fichiers `.tracevite-config` restent acceptés pour compatibilité). Utile pour les Chromebooks partagés.

## Fonctionnalités

### Construction

- **Segments** avec accrochage intelligent (grille, points existants, milieux, alignements)
- **Cercles** avec rayon et diamètre (3e cycle)
- **Réflexion** par rapport à un axe de symétrie
- **Translation** par flèche de translation (3e cycle)
- **Déplacement** de points en mode pick-up/put-down (pas de clic-glissé requis)
- **Perpendiculaire** et **parallèle** par rapport à un segment existant
- **Mesure et fixation** de longueurs et rayons exacts
- Chaînage de segments avec ancrage visuel explicite
- Détection automatique de figures fermées (triangles, quadrilatères) avec classification

### Mesures et propriétés

- Longueurs en temps réel (cm ou mm, virgule décimale française)
- Angles avec classification (aigu/droit/obtus) et mesure en degrés (3e cycle)
- Détection de parallélisme, perpendicularité, côtés et angles congrus
- Vocabulaire contextuel PFEQ : point/sommet, segment/côté

### Pensé pour les petites mains

- Pas besoin de cliquer-glisser — deux clics simples suffisent pour toutes les actions
- Filtre les petits mouvements involontaires pendant un clic
- Zones d'accrochage larges et ajustables pour que les clics « tombent au bon endroit »
- Gros boutons (44×44 px minimum) bien espacés
- La barre de statut explique toujours la prochaine étape en langage clair
- Protection contre les double-clics accidentels
- Annuler/rétablir sur 100+ niveaux — Escape comme bouton de secours
- Pas de double-clic, pas de clic droit, pas de gestes de précision
- Rétroaction sonore optionnelle pour confirmer les actions

### Pédagogie et projection

- Outil « Reproduire » pour les figures isométriques (compétence PFEQ 2e cycle)
- Outil « Comparer » pour superposer deux figures et vérifier l'isométrie
- Vérification d'axes de symétrie
- Frises et dallages par translation et réflexion
- Mode « démonstration » plein écran pour TBI/projecteur
- Mode « estimation » (mesures masquées jusqu'à vérification)

### Production

- **Export PDF à l'échelle 1:1** — un segment de 5 cm à l'écran mesure 5 cm sur papier
- Angles, arcs et carrés d'angle droit inclus dans le PDF
- Impression directe CSS en complément du PDF
- Segment-témoin de 5 cm pour vérification d'échelle
- Sauvegarde automatique (IndexedDB) avec constructions multiples et miniatures
- Export/import de fichiers `.geomolo` (JSON) pour la portabilité (les fichiers `.tracevite` restent acceptés pour compatibilité)
- Consigne d'exercice via fichier `.geomolo` ou URL de partage `#s=...`
- PWA installable avec mode hors-ligne (Service Worker)

## Confidentialité

GéoMolo ne collecte aucune donnée. Pas de comptes, pas de tracking, pas d'analytics. Toutes les constructions restent dans le navigateur de l'élève. Conforme à la Loi 25 du Québec.

## Stack technique

- React 18+ / TypeScript / Vite
- SVG pour le canevas interactif (DOM natif, pas de librairie canvas)
- jsPDF pour la génération PDF côté client
- idb-keyval pour la persistance IndexedDB
- vite-plugin-pwa pour le Service Worker
- Web Audio API pour la synthèse sonore
- Zéro backend — tout est client-side, aucune donnée ne quitte le navigateur

## Développement

```bash
npm install          # Installer les dépendances
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run preview      # Prévisualiser le build
npm run lint         # Linter
npm run test         # Tests
```

Navigateurs supportés : Chrome/Edge 90+, Firefox 90+, Safari 15+. Optimisé pour Chromebook 11.6" (1366×768, 135 dpi).

## Licence

[MIT](LICENSE)

## Contact

info@allomolo.ca

---

Créé au Québec par un parent, pour son enfant — et pour tous ceux qui en ont besoin.
