# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GéoMolo is a digital geometric construction tool for elementary school children (ages 8-12) with Developmental Coordination Disorder (DCD/dyspraxia) in Quebec. It replaces physical instruments (ruler, compass, protractor) while preserving geometric reasoning. The child does the thinking; the tool executes the drawing gesture.

The complete specification is in `spec.md`.

## Logo

`logo.svg` — A geometric logo formed by two perpendicular segments with endpoint dots in primary blue (#185FA5) and a right-angle square marker in teal (#0B7285). Used as favicon, PWA icon (192/512px), and app header. Works in black & white for PDF. The right-angle marker is the signature visual element.

## Tech Stack

- React 18+ with TypeScript
- Vite as build tool
- **SVG** for the interactive construction canvas (no Konva.js, no Fabric.js — SVG elements are standard DOM with native events, sufficient for < 100 elements)
- jsPDF for client-side PDF generation (programmatic drawing, no svg2pdf.js)
- idb-keyval for IndexedDB persistence
- vite-plugin-pwa for Service Worker / offline support
- No backend — everything is client-side, no accounts, no cloud storage, no analytics/tracking

## Build & Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run linter
npm run test         # Run tests
```

## Release & Versioning

- **Branches:** `dev` for development, `main` for production. Cloudflare auto-deploys on push to `main`.
- **Conventional commits:** `fix:` → patch, `feat:` → minor, `BREAKING CHANGE` → major.
- **Release script:** `npm run release` (or `./scripts/release.sh`). Auto-detects bump from commits since last tag, merges `dev` → `main`, runs `npm version`, creates lightweight git tag, pushes branch and tag separately (not `--follow-tags` which only pushes annotated tags), syncs `dev`.
- **Build hash & branch:** `__BUILD_HASH__` (git short hash) and `__GIT_BRANCH__` injected at build time via `vite.config.ts`. The About dialog shows `v{version}` on main, `dev ({hash})` otherwise. Branch detection: `CF_PAGES_BRANCH` env → git branch → tag match → release commit message match → fallback `dev`.
- **Tags:** Lightweight semver with `v` prefix (`v0.1.0`, `v0.2.0`). Created by the release script, never manually. Must be pushed explicitly (`git push origin v{version}`).

## Architecture

### Core Layers

- **`src/components/`** — React UI: `App.tsx` (layout), `Toolbar.tsx` (tools bar), `StatusBar.tsx` (sequencing cues), `Canvas.tsx` (interactive drawing surface), `PropertiesPanel.tsx` (right sidebar with measurements), `ContextActions.tsx` (contextual action bar near selected element), `PrintDialog.tsx` (print instructions + PDF export), `ModeSelector.tsx` (display mode selector: Simplifié / Complet)
- **`src/engine/`** — Pure computation: `geometry.ts` (distances, angles, intersections), `snap.ts` (grid/vertex/angle/alignment snapping), `properties.ts` (auto-detection of parallelism, perpendicularity, figure classification), `reflection.ts` (reflection across axis), `pdf-export.ts` (1:1 scale PDF generation), `sound.ts` (Web Audio snap/creation/closure sounds)
- **`src/model/`** — Data model: `types.ts` (Point, Segment, Circle, AngleInfo, DetectedProperty, ConstructionState, ToolType), `state.ts` (global construction state + undo history), `persistence.ts` (IndexedDB save/restore via idb-keyval), `preferences.tsx` (user preferences: segment color, panel position, high contrast)
- **`src/hooks/`** — React hooks: `useConstruction.ts`, `useSnap.ts`, `useUndo.ts`, `useAutoSave.ts`
- **`src/config/`** — Constants: `accessibility.ts` (snap tolerances, button sizes, undo levels), `theme.ts` (color palette), `messages.ts` (status bar messages)

### Critical Design Decisions

**Internal units are millimeters.** All coordinates and measurements are stored in mm. Display unit is configurable: cm (default) or mm, with French comma separator (e.g., "4,5 cm"). PDF output maps mm directly to PDF units (1 mm = 2.835 PDF units).

**PDF 1:1 scale is the #1 priority.** A 5 cm segment on screen MUST measure 5 cm on printed paper. PDF must be vectorial (never raster). Page format: US Letter (215.9mm x 279.4mm), 15mm margins. Include a 5 cm witness segment for scale verification.

**Snap system compensates for motor imprecision.** Tolerances are in physical mm (not pixels) to work across screen densities. Priority order: existing points (7mm) > segment midpoints (5mm) > grid (5mm) > angle snap (±5°) > alignment (2mm). Snap is on by default. Two tolerance profiles: "large" (×1.5) for younger children (8-9 years), "very large" (×2.0) for severe DCD.

**Display mode selector (Simplifié / Complet)** adapts displayed information. The labels are non-judgmental — they describe the interface, not the child's level. Simplifié (default): angle classification only (aigu/droit/obtus), no degrees, no circle tool, single triangle classification, clutter threshold 5 segments. Complet: full degree measurements, circle tool available, cumulative triangle classification, clutter threshold 6 segments. The ModeSelector is a custom dropdown (not native `<select>`) with detail text preserving the professional reference: "Affichage essentiel (correspond au 2e cycle)" / "Toutes les mesures et outils (correspond au 3e cycle)". Closed state shows "Simplifié" or "Complet". Internal code value is `'simplifie'` (without accent).

**No right-click anywhere.** All actions via click-to-select + contextual action bar (44x44px buttons). Designed for children with motor difficulties.

**Auto-save to IndexedDB** (via idb-keyval) after every action (2s debounce) + on `beforeunload`. Multiple save slots ("Mes constructions"). Export/import `.geomolo` JSON files (`.tracevite` accepted for backward compatibility). Construction restored on page reload. Never lose work.

**Consigne is passive display only.** The optional `consigne` field (max 1000 chars) shows the teacher's exercise instruction as a read-only banner below the status bar. Settable via `.geomolo` file (or legacy `.tracevite`) or URL query params (`?consigne=&mode=`). The tool never validates, corrects, or interacts with the consigne — no exercise engine, no correction, no backend. Sanitized via `textContent` (never `innerHTML`) to prevent XSS from URL params. See spec.md §8.0.1 and §8.0.2.

**Property detection tolerances:**
- Parallel: angle between directions < 0.5°
- Perpendicular: angle in [89.5°, 90.5°]
- Equal lengths: ±1mm
- Right angle display: ±0.5°
- Angle classification is evaluated by priority (disjoint intervals): right [89.5°, 90.5°] > flat [179.5°, 180.5°] > acute ]0°, 89.5°[ > obtuse ]90.5°, 179.5°[

**Figure classification** triggers when a closed polygon is detected (minimal cycle via BFS when a segment connects to an existing point). Triangle classification is **cumulative in Complet mode only** (a triangle can be "rectangle isocèle"); in Simplifié mode, only the most specific single classification is shown. Quadrilaterals: square/rectangle/rhombus/parallelogram/trapezoid. Self-intersecting polygons are detected but not classified. **Perimeter and area are NOT displayed** in any mode — the tool compensates for motor gestures (ruler, compass, protractor), not for calculations. The child sees side lengths and angles; they calculate perimeter and area themselves. The Figure interface has no perimeterMm or areaMm2 fields. Selection is cross-cutting (no dedicated Select tool) — clicking an element while idle in any tool selects it.

**"Hide properties" toggle** in the properties panel. When active, hides detected properties (parallelism, perpendicularity, congruence marks, figure names) — but NOT segment lengths or angle values. Segments, points, circles, labels (A, B, C) and their individual measurements remain visible. For evaluation contexts where the student must identify properties themselves. Toggle state is saved per-construction.

## TDC Interaction Principles (designed for motor accessibility)

These principles are non-negotiable — they determine whether the tool is usable by the target population:

- **Two-click mode is default for all actions.** Click-drag (maintaining pressure during movement) is the hardest gesture for DCD children. Every drag action (circle, move) must have a two-click alternative: click to pick up, move (no button held), click to put down. Drag remains available as alternative.
- **No timeouts on input fields.** Length input fields stay visible until user dismisses (Enter, click elsewhere, Escape). DCD children need more time to coordinate visual attention, cursor movement, and keyboard input.
- **Status bar shows sequencing cues.** A contextual bar under the toolbar always shows the active tool and expected next gesture in plain language (e.g., "Segment — Clique pour placer le premier point"). This is a standard OT accommodation for planning/sequencing difficulties.
- **Keyboard shortcuts disabled by default.** Single-letter shortcuts cause accidental tool switches due to imprecise keystrokes. Toggle in settings for the teacher/OT to enable. Toast notification (5s, or dismiss on next click) on keyboard tool changes only (not toolbar clicks). Toasts replace, don't stack.
- **Escape = panic button.** Hierarchical: close dialog > cancel action > deselect > return to Segment tool. Predictable, reassuring.
- **Destructive buttons physically separated.** "New construction" button is red, isolated at far right of action bar, away from Undo/Redo. A 15px misclick must not erase all work.
- **Visual clutter thresholds.** Angle labels on canvas hidden after 5 segments (Simplifié) / 6 segments (Complet). Panel always shows all data.
- **Chaining is visually explicit.** Pulsing anchor point + more transparent ghost segment + status bar message. Auto-terminates after configurable inactivity timeout (default 8s; options: 5s/8s/15s/off).
- **No dual gestures (hold + move).** Shift for angle constraint is a toggle (single press), not hold-while-dragging.
- **Optional sounds.** Three modes: Off, Reduced (default — segment creation + figure closure only), Full (snap + segment creation + figure closure). 50ms synthesized sounds via Web Audio API. Gain slider (0-1). Haptic feedback (30ms vibrate) on supported devices. Compensates proprioceptive feedback deficit.
- **Drag detection threshold: 1.5mm physical** (~8px CSS on Chromebook 135dpi). Movement < 1.5mm from pointerdown is a click, not a drag. DCD children involuntarily move 0.5-1mm during clicks. Converted to CSS px at runtime via devicePixelRatio.
- **Point display radius: 3mm physical** on screen (~11-14px). PDF uses 1mm radius. Hit detection covered by 7mm snap zone.
- **Font minimum 13px** on canvas. Adjustable larger via settings (1x / 1.25x / 1.5x).
- **Progressive disclosure (Simplifié mode):** Only Segment, Déplacer, and Réflexion visible by default in toolbar. Other tools via "Plus d'outils" button. Reduces choice overload for younger children with executive function difficulties.
- **Angle "rentrant" removed from MVP.** Entirely out of primary curriculum. Only aigu/droit/obtus/plat (plat hidden in Simplifié mode).
- **Service Worker graceful degradation.** If SW installation fails (blocked by school content filters), app works normally in online-only mode. Never block core functionality on SW availability.

## UI Constraints

- **Language:** Interface entirely in French (Quebec). Use PFEQ geometric vocabulary exactly (see spec.md Annexe A)
- **Vocabulary is context-sensitive:** "Point" becomes "Sommet" when part of a closed figure. "Segment" becomes "Côté" when part of a closed figure. Never use "cathètes" (secondary school term) — say "côtés de l'angle droit". This is a strong PFEQ requirement.
- **Decimal format:** French comma, never dot. Unit "cm" by default, "mm" available.
- **Minimum click targets:** 44x44px with 8px minimum spacing between adjacent buttons (motor accessibility)
- **Use PointerEvent (not MouseEvent)** for all canvas interactions — enables stylus/touch support from day one
- **No double-clicks, no right-clicks, no precision gestures** — snap compensates. Canvas click debounce of 150ms prevents accidental double-tap (DCD finger re-bound).
- **`inputmode="decimal"`** on all numeric input fields (length, radius). Reposition field to top of canvas when virtual keyboard detected (tablet).
- **`beforeunload` confirmation dialog** when canvas has elements — prevents accidental tab closure (Ctrl+W instead of Ctrl+Z).
- **Keyboard navigation in UI** (Tab/Enter) works at MVP via semantic HTML elements. Canvas SVG keyboard nav is v2.
- **Color palette:** Canvas background #FAFCFF (slight blue tint — "digital graph paper" feel). Canvas: segments/points/labels #185FA5 (blue), guides/right-angle #0B7285 (teal), angle arcs #C24B22 (burnt orange), measurements #3A6291 (dark blue-grey). UI: primary #185FA5, destructive #C82828, bg #F5F7FA, text #1A2433. Full palette in spec.md §13.2. Never rely on color alone — always pair with shape markers.
- **PDF is black & white only** (school printers). PDF filename: `{slot-name}.pdf` (spaces→dashes).
- **Bundle size target ~300 Ko gzipped** (design goal, not hard limit — keep an eye on it)

## Git Conventions

Never include "Co-Authored-By" or any Claude/AI attribution in commit messages.

## Implemented Features (MVP + v2 complete)

All MVP and v2 features are implemented. Current feature set: Grid canvas (5mm/1cm/2cm), Segment tool with snap + inline length input + explicit chaining, Move tool (pick-up/put-down default), Circle tool (two-click default), Reflection tool, Perpendicular tool, Parallel tool, Translation tool (Complet mode), Reproduce tool (figure duplication), Compare tool (isometric comparison), Frieze tool (friezes and tilings), Symmetry tool, real-time lengths & angles (adapted by display mode), parallelism/perpendicularity detection & guides, Measure/Fix (Longueur — fix and unfix segment length), auto-intersection on segment creation (enabled by default, opt-out in settings), selection via click + contextual action bar (with micro-confirmation on delete), status bar with sequencing cues, collapsible accordion properties panel (context-sensitive vocabulary), 1:1 PDF export (A4/Letter, portrait/landscape) with print instruction dialog + direct CSS print, undo/redo (100 levels, fully persisted), closed figure detection, IndexedDB auto-save with multiple slots + .geomolo file export/import (FILE_VERSION 2, v1 files migrate schoolLevel to displayMode; .tracevite files accepted for backward compatibility) + .geomolo-config settings profiles (.tracevite-config accepted for backward compatibility), PWA with Service Worker for offline use (with Deep Freeze erasure detection), display mode selector (Simplifié/Complet, custom dropdown with professional cycle references in detail text), unit toggle (cm/mm), optional snap sound (3 modes: off/reduced/full), action-based welcome tutorial, consigne field (optional exercise instruction from teacher, displayed as read-only banner, settable via .geomolo file (or legacy .tracevite) or URL query params `?consigne=&mode=`, with `?level=` accepted for backward compatibility), Cartesian plane mode (1 quadrant / 4 quadrants), estimation mode (hide measurements until revealed), segment color customization (4 WCAG AA colors), left-hand panel option, pinch-to-zoom, demonstration mode (fullscreen for IWB), cursor smoothing filter, fatigue reminder, high contrast mode, tablet/stylus support with palm rejection, About dialog. See spec.md section 19 for v3 roadmap (remaining: 3D solids, background image import, quick templates).
