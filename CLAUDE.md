# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TraceVite is a digital geometric construction tool for elementary school children (ages 8-12) with Developmental Coordination Disorder (DCD/dyspraxia) in Quebec. It replaces physical instruments (ruler, compass, protractor) while preserving geometric reasoning. The child does the thinking; the tool executes the drawing gesture.

The complete specification is in `spec.md`.

## Tech Stack

- React 18+ with TypeScript
- Vite as build tool
- SVG or Canvas (via Konva.js/React Konva or Fabric.js) for the interactive construction canvas
- jsPDF + svg2pdf.js for client-side PDF generation
- No backend — everything is client-side, no accounts, no cloud storage

## Build & Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run linter
npm run test         # Run tests
```

## Architecture

### Core Layers

- **`src/components/`** — React UI: `App.tsx` (layout), `Toolbar.tsx` (tools bar), `Canvas.tsx` (interactive drawing surface), `PropertiesPanel.tsx` (right sidebar with measurements), `PrintButton.tsx` (PDF export)
- **`src/engine/`** — Pure computation: `geometry.ts` (distances, angles, intersections), `snap.ts` (grid/vertex/angle/alignment snapping), `properties.ts` (auto-detection of parallelism, perpendicularity, figure classification), `pdf-export.ts` (1:1 scale PDF generation)
- **`src/model/`** — Data model: `types.ts` (Point, Segment, Circle, AngleInfo, DetectedProperty, ConstructionState, ToolType), `state.ts` (global construction state + undo history)
- **`src/hooks/`** — React hooks: `useConstruction.ts`, `useSnap.ts`, `useUndo.ts`

### Critical Design Decisions

**Internal units are millimeters.** All coordinates and measurements are stored in mm. Display to user is always in cm with 1 decimal and French comma separator (e.g., "4,5 cm"). PDF output maps mm directly to PDF units (1 mm = 2.835 PDF units).

**PDF 1:1 scale is the #1 priority.** A 5 cm segment on screen MUST measure 5 cm on printed paper. PDF must be vectorial (never raster). Page format: US Letter (215.9mm x 279.4mm), 15mm margins. Include a 5 cm witness segment for scale verification.

**Snap system compensates for motor imprecision.** Priority order: existing points (15px tolerance) > grid (8px) > angle snap (±5°) > alignment (5px). Snap is on by default.

**Property detection tolerances:**
- Parallel: angle between directions < 0.5°
- Perpendicular: angle in [89.5°, 90.5°]
- Equal lengths: ±1mm
- Right angle display: ±0.5°

**Figure classification** triggers when a closed polygon is detected (cycle of connected segments). Triangles: equilateral/isosceles/right/scalene. Quadrilaterals: square/rectangle/rhombus/parallelogram/trapezoid.

## UI & Accessibility Constraints

- **Language:** Interface entirely in French (Quebec). Use PFEQ geometric vocabulary exactly (see spec.md Annexe A)
- **Decimal format:** French comma, never dot. Unit "cm" everywhere.
- **Minimum click targets:** 44x44px (motor accessibility)
- **No double-clicks, no precision gestures** — snap compensates
- **Color palette:** Segments #185FA5, guides #0F6E56, angle arcs (right: green #0F6E56, acute/obtuse: orange #D85A30), measurements #4A6FA5
- **PDF is black & white only** (school printers)

## MVP Scope (v1)

Grid canvas, Segment tool with snap, Move tool, real-time lengths & angles, parallelism/perpendicularity detection & guides, Measure/Fix tool, properties panel, 1:1 PDF export, undo/redo, closed figure detection. See spec.md section 19 for v2/v3 roadmap.
