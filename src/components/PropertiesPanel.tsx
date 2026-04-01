import { memo } from 'react';
import type { ConstructionState, AngleInfo, DetectedProperty, DisplayMode } from '@/model/types';
import type { Figure } from '@/engine/figures';
import { AccordionSection } from './AccordionSection';
import {
  PANEL_WIDTH,
  UI_BG,
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_PRIMARY,
} from '@/config/theme';
import { formatLength } from '@/engine/format';

interface PropertiesPanelProps {
  readonly state: ConstructionState;
  readonly angles: readonly AngleInfo[];
  readonly properties: readonly DetectedProperty[];
  readonly figures: readonly Figure[];
  readonly displayMode: DisplayMode;
  readonly hideProperties: boolean;
  readonly onToggleHideProperties: () => void;
  readonly onSelectElement: (elementId: string) => void;
  readonly collapsed: boolean;
  readonly onToggleCollapsed: () => void;
  readonly hasNewProperties?: boolean;
  readonly fontScale?: number;
  readonly estimationActive?: boolean;
}

export const PropertiesPanel = memo(function PropertiesPanel({
  state,
  angles,
  properties,
  figures,
  displayMode,
  hideProperties,
  onToggleHideProperties,
  onSelectElement,
  collapsed,
  onToggleCollapsed,
  hasNewProperties,
  fontScale = 1,
  estimationActive = false,
}: PropertiesPanelProps) {
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapsed}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 44,
          height: 44,
          background: UI_SURFACE,
          border: `1px solid ${UI_BORDER}`,
          borderRadius: '0 0 0 8px',
          cursor: 'pointer',
          fontSize: 16,
          zIndex: 20,
        }}
        aria-label="Ouvrir le panneau"
        data-testid="panel-toggle"
      >
        ◀
        {hasNewProperties && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#185FA5',
            }}
            data-testid="panel-badge"
          />
        )}
      </button>
    );
  }

  const figurePointIds = new Set(figures.flatMap((f) => [...f.pointIds]));
  const figureSegmentIds = new Set(figures.flatMap((f) => [...f.segmentIds]));

  // Build set of segment IDs that are "côtés de l'angle droit" in right triangles (spec §9.1)
  const rightAngleSideIds = new Set<string>();
  for (const fig of figures) {
    if (fig.pointIds.length !== 3 || !fig.name.includes('rectangle')) continue;
    for (const ptId of fig.pointIds) {
      const angle = angles.find(
        (a) =>
          a.vertexPointId === ptId &&
          a.classification === 'droit' &&
          fig.pointIds.includes(a.ray1PointId) &&
          fig.pointIds.includes(a.ray2PointId),
      );
      if (!angle) continue;
      for (const segId of fig.segmentIds) {
        const seg = state.segments.find((s) => s.id === segId);
        if (seg && (seg.startPointId === ptId || seg.endPointId === ptId)) {
          rightAngleSideIds.add(segId);
        }
      }
    }
  }

  return (
    <div
      style={{
        width: PANEL_WIDTH,
        background: UI_BG,
        borderLeft: `2px solid ${UI_PRIMARY}`,
        overflowY: 'auto',
        flexShrink: 0,
        fontSize: 12 * fontScale,
      }}
      data-testid="properties-panel"
    >
      {/* Panel header with collapse button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px 2px',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: UI_TEXT_SECONDARY }}>Propriétés</span>
        <button
          onClick={onToggleCollapsed}
          style={{
            width: 28,
            height: 28,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
          }}
          aria-label="Fermer le panneau"
        >
          ▶
        </button>
      </div>

      {/* Segments / Côtés — titre adapté au contexte (spec §9.0) */}
      <AccordionSection
        title={
          state.segments.length > 0 && state.segments.every((s) => figureSegmentIds.has(s.id))
            ? 'Côtés'
            : 'Segments'
        }
        defaultOpen
      >
        {state.segments.map((seg) => {
          const start = state.points.find((p) => p.id === seg.startPointId);
          const end = state.points.find((p) => p.id === seg.endPointId);
          if (!start || !end) return null;
          const label = `${start.label}${end.label}`;
          const prefix = figureSegmentIds.has(seg.id) ? 'Côté' : 'Segment';

          return (
            <div
              key={seg.id}
              onClick={() => onSelectElement(seg.id)}
              style={{ padding: '2px 0', cursor: 'pointer', color: UI_TEXT_PRIMARY }}
            >
              <span style={{ fontWeight: 500 }}>
                {prefix} {label}
              </span>
              {!estimationActive && (
                <span style={{ color: UI_TEXT_SECONDARY, marginLeft: 6 }}>
                  {formatLength(seg.lengthMm, state.displayUnit)}
                </span>
              )}
              {!estimationActive && rightAngleSideIds.has(seg.id) && (
                <span style={{ color: UI_TEXT_SECONDARY, marginLeft: 4, fontSize: '0.9em' }}>
                  (côté de l'angle droit)
                </span>
              )}
            </div>
          );
        })}
        {state.segments.length === 0 && (
          <div style={{ color: UI_TEXT_SECONDARY, fontStyle: 'italic' }}>Aucun segment</div>
        )}
      </AccordionSection>

      {/* Angles */}
      <AccordionSection title="Angles">
        {angles.map((angle, i) => {
          const vertex = state.points.find((p) => p.id === angle.vertexPointId);
          if (!vertex) return null;

          return (
            <div
              key={i}
              onClick={() => onSelectElement(angle.vertexPointId)}
              style={{ padding: '2px 0', cursor: 'pointer', color: UI_TEXT_PRIMARY }}
            >
              <span>∠{vertex.label}</span>
              <span style={{ color: UI_TEXT_SECONDARY, marginLeft: 6 }}>
                {displayMode === 'complet' && !estimationActive
                  ? `${Math.round(angle.degrees)}°`
                  : ''}{' '}
                {angle.classification === 'droit'
                  ? '(droit)'
                  : angle.classification === 'aigu'
                    ? '(aigu)'
                    : angle.classification === 'obtus'
                      ? '(obtus)'
                      : angle.classification === 'plat'
                        ? displayMode === 'simplifie'
                          ? '(points alignés)'
                          : '(plat)'
                        : ''}
              </span>
            </div>
          );
        })}
        {angles.length === 0 && (
          <div style={{ color: UI_TEXT_SECONDARY, fontStyle: 'italic' }}>Aucun angle</div>
        )}
      </AccordionSection>

      {/* Propriétés détectées */}
      <AccordionSection title="Propriétés">
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={hideProperties}
            onChange={onToggleHideProperties}
            data-testid="hide-properties-toggle"
          />
          <span style={{ fontSize: 11, color: UI_TEXT_SECONDARY }}>Masquer les propriétés</span>
        </label>

        {!hideProperties && (
          <>
            {properties.map((prop, i) => (
              <div key={i} style={{ padding: '2px 0', color: UI_TEXT_PRIMARY }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#E8F5E9',
                    fontSize: 11,
                  }}
                >
                  {prop.label}
                </span>
              </div>
            ))}
            {figures.map((fig) => (
              <div key={fig.id} style={{ padding: '2px 0' }}>
                <div style={{ color: UI_PRIMARY, fontWeight: 600 }}>{fig.name}</div>
                {fig.height && !estimationActive && (
                  <div style={{ color: UI_TEXT_SECONDARY, fontSize: 11, marginTop: 2 }}>
                    {fig.height.isTriangle
                      ? `Aire = base × hauteur ÷ 2 = ${formatLength(fig.height.baseLengthMm, state.displayUnit)} × ${formatLength(fig.height.heightMm, state.displayUnit)} ÷ 2`
                      : `Aire = base × hauteur = ${formatLength(fig.height.baseLengthMm, state.displayUnit)} × ${formatLength(fig.height.heightMm, state.displayUnit)}`}
                  </div>
                )}
              </div>
            ))}
            {properties.length === 0 && figures.length === 0 && (
              <div style={{ color: UI_TEXT_SECONDARY, fontStyle: 'italic' }}>Aucune propriété</div>
            )}
          </>
        )}
      </AccordionSection>

      {/* Cercles (spec §6.3) */}
      {state.circles.length > 0 && (
        <AccordionSection title="Cercles">
          {state.circles.map((circle) => {
            const center = state.points.find((p) => p.id === circle.centerPointId);
            if (!center) return null;
            const isSelected = circle.id === state.selectedElementId;
            return (
              <div
                key={circle.id}
                onClick={() => onSelectElement(circle.id)}
                style={{
                  padding: '2px 0',
                  cursor: 'pointer',
                  color: UI_TEXT_PRIMARY,
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? '#E8F0FA' : 'transparent',
                  borderRadius: 2,
                }}
              >
                <span style={{ fontWeight: 500 }}>Centre {center.label}</span>
                {!estimationActive && (
                  <span style={{ color: UI_TEXT_SECONDARY, marginLeft: 6 }}>
                    r = {formatLength(circle.radiusMm, state.displayUnit)}, d ={' '}
                    {formatLength(circle.radiusMm * 2, state.displayUnit)}
                  </span>
                )}
              </div>
            );
          })}
        </AccordionSection>
      )}

      {/* Points / Sommets — titre adapté au contexte (spec §9.0) */}
      <AccordionSection
        title={
          state.points.length > 0 && state.points.every((p) => figurePointIds.has(p.id))
            ? 'Sommets'
            : 'Points'
        }
      >
        {state.points.map((point) => {
          const prefix = figurePointIds.has(point.id) ? 'Sommet' : 'Point';
          return (
            <div
              key={point.id}
              onClick={() => onSelectElement(point.id)}
              style={{ padding: '2px 0', cursor: 'pointer', color: UI_TEXT_PRIMARY }}
            >
              <span>
                {prefix} {point.label}
              </span>
              {point.locked && <span style={{ color: UI_TEXT_SECONDARY, marginLeft: 4 }}>🔒</span>}
            </div>
          );
        })}
      </AccordionSection>
    </div>
  );
});
