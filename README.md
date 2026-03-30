# TraceVite

Outil de construction géométrique numérique pour les élèves du primaire ayant un **Trouble Développemental de la Coordination** (TDC/dyspraxie).

TraceVite remplace la règle, le compas et le rapporteur — instruments que l'enfant TDC ne peut pas manipuler avec précision — tout en préservant la réflexion géométrique. L'enfant fait le raisonnement, l'outil exécute le geste.

**[tracevite.ca](https://tracevite.ca)**

## Pourquoi

Les enfants avec un TDC comprennent la géométrie mais ne peuvent pas la tracer. Le passage du raisonnement au geste moteur est le blocage. TraceVite est à la règle et au compas ce que la calculatrice est au calcul mental.

L'outil est aligné sur le Programme de formation de l'école québécoise (PFEQ) et la Progression des apprentissages (PDA) en géométrie et mesure, du 2e au 3e cycle du primaire (8-12 ans).

## Fonctionnalités

### Construction

- **Segments** avec accrochage intelligent (grille, points existants, milieux, alignements)
- **Cercles** avec rayon et diamètre (3e cycle)
- **Réflexion** par rapport à un axe de symétrie
- **Translation** par flèche de translation (3e cycle)
- **Déplacement** de points en mode pick-up/put-down (pas de clic-glissé requis)
- **Mesure et fixation** de longueurs exactes
- Chaînage de segments avec ancrage visuel explicite
- Détection automatique de figures fermées (triangles, quadrilatères) avec classification

### Mesures et propriétés

- Longueurs en temps réel (cm ou mm, virgule décimale)
- Angles avec classification (aigu/droit/obtus) et mesure en degrés (3e cycle)
- Détection de parallélisme, perpendicularité, côtés et angles congrus
- Périmètre et aire des figures fermées (formules selon le cycle)
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

### Niveaux scolaires

- **2e cycle** (3e-4e année) : angles par classification seulement, outils essentiels, barre d'outils simplifiée
- **3e cycle** (5e-6e année) : mesures en degrés, cercle, plan cartésien, classification cumulative des triangles
- Toggle « Masquer les propriétés » pour les contextes d'évaluation

### Production

- **Export PDF à l'échelle 1:1** — un segment de 5 cm à l'écran mesure 5 cm sur papier
- Impression directe CSS en complément du PDF
- Segment-témoin de 5 cm pour vérification d'échelle
- Sauvegarde automatique (IndexedDB) avec créneaux multiples
- Export/import de fichiers `.tracevite` (JSON) pour la portabilité
- Profils de paramètres `.tracevite-config` pour les ergothérapeutes
- Consigne d'exercice via fichier ou paramètre URL (`?consigne=&level=`)
- PWA installable avec mode hors-ligne (Service Worker)

### Pédagogie et projection

- Outil « Reproduire » pour les figures isométriques (compétence PFEQ 2e cycle)
- Vérification d'axes de symétrie
- Frises et dallages par translation et réflexion
- Mode « démonstration » plein écran pour TBI/projecteur
- Mode « estimation » (mesures masquées jusqu'à vérification)
- Panneau repositionnable à gauche pour les gauchers

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

## Possibilités futures

- Développements de solides (visualisation 3D, dépliage en patron 2D)
- Import d'image de fond (scanner un exercice papier et construire par-dessus)
- Mode gabarit rapide pour les figures courantes

## Confidentialité

TraceVite ne collecte aucune donnée. Pas de comptes, pas de tracking, pas d'analytics. Toutes les constructions restent dans le navigateur de l'élève. Conforme à la Loi 25 du Québec.

## Licence

[MIT](LICENSE)

## Contact

ma@tracevite.ca

---

Conçu au Québec pour les enfants TDC et leurs enseignants.
