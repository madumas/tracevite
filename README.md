# TraceVite

Outil de construction géométrique numérique pour les élèves du primaire ayant un **Trouble Développemental de la Coordination** (TDC/dyspraxie).

TraceVite remplace la règle, le compas et le rapporteur — instruments que l'enfant TDC ne peut pas manipuler avec précision — tout en préservant la réflexion géométrique. L'enfant fait le raisonnement, l'outil exécute le geste.

**[tracevite.ca](https://tracevite.ca)**

## Pourquoi

Les enfants avec un TDC comprennent la géométrie mais ne peuvent pas la tracer. Le passage du raisonnement au geste moteur est le blocage. TraceVite est à la règle et au compas ce que la calculatrice est au calcul mental.

L'outil est aligné sur le Programme de formation de l'école québécoise (PFEQ) et la Progression des apprentissages (PDA) en géométrie et mesure, du 2e au 3e cycle du primaire (8-12 ans).

## Guide pour les enseignants et les parents

TraceVite s'adapte aux besoins de chaque enfant grâce à des réglages accessibles via le bouton engrenage (paramètres). Voici les options à considérer selon le profil de l'élève.

### Mode d'affichage (Simplifié / Complet)

Le sélecteur en haut de l'écran contrôle le niveau d'information affiché :

- **Simplifié** (par défaut) : correspond au 2e cycle. Angles par classification seulement (aigu/droit/obtus), barre d'outils réduite aux essentiels (Segment, Déplacer, Réflexion + « Plus d'outils »), pas de cercle, pas de degrés.
- **Complet** : correspond au 3e cycle. Mesures en degrés, cercle, translation, plan cartésien, classification cumulative des triangles.

Choisir le mode selon le niveau scolaire de l'enfant, pas selon ses capacités motrices.

### Tolérance d'accrochage (snap)

Contrôle la zone dans laquelle un clic « accroche » automatiquement un point existant ou la grille :

- **Normal** : tolérance standard (7 mm pour les points, 5 mm pour la grille)
- **Large** (×1,5) : recommandé pour les 8-9 ans ou les TDC légers
- **Très large** (×2,0) : recommandé pour les TDC sévères ou en début d'apprentissage

En cas de doute, commencer par « Large » et ajuster selon les frustrations observées.

### Feedback sonore

Trois modes selon la sensibilité de l'enfant :

- **Désactivé** (par défaut) : aucun son
- **Réduit** : son à la création d'un segment et à la fermeture d'une figure seulement
- **Complet** : son d'accrochage (snap), de création et de fermeture

Le son compense le déficit de rétroaction proprioceptive. Un enfant qui « ne sait pas si son clic a fonctionné » bénéficiera du mode réduit ou complet. Le volume est ajustable.

### Délai de chaînage

Quand l'élève trace des segments bout à bout, le chaînage s'arrête automatiquement après une période d'inactivité :

- **5 secondes** : pour les élèves rapides
- **8 secondes** (par défaut) : bon compromis
- **15 secondes** : pour les enfants qui ont besoin de plus de temps de planification
- **Désactivé** : le chaînage ne s'arrête jamais automatiquement (cliquer ailleurs ou Échap)

### Raccourcis clavier

**Désactivés par défaut.** Les raccourcis à une touche (S pour segment, C pour cercle, etc.) causent des changements d'outil accidentels chez les enfants TDC dont les frappes manquent de précision. Activer uniquement si l'enfant ou l'enseignant en exprime le besoin.

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

L'enseignant peut transmettre une consigne directement dans l'URL :

```
https://tracevite.ca/?consigne=Trace un triangle rectangle isocèle&mode=complet
```

L'élève ouvre le lien et voit la consigne en bannière. Un nouveau slot vierge est créé automatiquement — le travail précédent est préservé.

### Profils de paramètres

L'ergothérapeute ou l'enseignant peut exporter un fichier `.tracevite-config` contenant tous les réglages adaptés à un élève, puis l'importer sur un autre appareil. Utile pour les Chromebooks partagés.

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

### Adaptation au TDC

- **Mode deux clics par défaut** pour toutes les actions (pas de clic-glissé maintenu)
- Seuil de détection du glissé à 1,5 mm physique (filtrage des micro-mouvements involontaires)
- Zones de snap larges avec profils de tolérance ajustables (normal / large / très large)
- Cibles de clic minimum 44×44 px avec espacement de 8 px
- Barre de statut avec séquençage des étapes en langage clair
- Debounce des clics (150 ms) pour éviter les double-taps involontaires
- Undo/redo sur 100+ niveaux — Escape comme bouton de secours hiérarchique
- Pas de double-clic, pas de clic droit, pas de gestes de précision
- Feedback sonore optionnel (synthèse Web Audio, pas de fichiers)

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
- Export/import de fichiers `.tracevite` (JSON) pour la portabilité
- Consigne d'exercice via fichier ou paramètre URL (`?consigne=&mode=`)
- PWA installable avec mode hors-ligne (Service Worker)

## Confidentialité

TraceVite ne collecte aucune donnée. Pas de comptes, pas de tracking, pas d'analytics. Toutes les constructions restent dans le navigateur de l'élève. Conforme à la Loi 25 du Québec.

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

ma@tracevite.ca

---

Conçu au Québec pour les enfants TDC et leurs enseignants.
