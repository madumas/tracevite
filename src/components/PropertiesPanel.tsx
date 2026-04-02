import { memo } from 'react';
import type { ConstructionState, AngleInfo, DetectedProperty, DisplayMode } from '@/model/types';
import type { Figure } from '@/engine/figures';
import { AccordionSection } from './AccordionSection';
import {
  PANEL_WIDTH,
  UI_BG,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_PRIMARY,
} from '@/config/theme';
import { formatLength } from '@/engine/format';
import { BOUNDS_WIDTH_MM, BOUNDS_HEIGHT_MM } from '@/engine/viewport';
import type { PanelPosition } from '@/model/preferences';

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
  readonly panelPosition?: PanelPosition;
  readonly fontScale?: number;
  readonly estimationActive?: boolean;
  readonly onHoverElement?: (elementId: string | null) => void;
  readonly hoveredElementId?: string | null;
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
  panelPosition = 'right',
  fontScale = 1,
  estimationActive = false,
  onHoverElement,
  hoveredElementId,
}: PropertiesPanelProps) {
  const isLeft = panelPosition === 'left';

  if (collapsed) {
    return (
      <div
        style={{
          width: 32,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-start',
          paddingTop: 8,
          background: UI_BG,
          borderLeft: isLeft ? 'none' : `1px solid ${UI_BORDER}`,
          borderRight: isLeft ? `1px solid ${UI_BORDER}` : 'none',
        }}
      >
        <button
          onClick={onToggleCollapsed}
          style={{
            width: 32,
            height: 44,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            color: UI_TEXT_SECONDARY,
            position: 'relative',
          }}
          aria-label="Ouvrir le panneau"
          data-testid="panel-toggle"
        >
          {isLeft ? '▶' : '◀'}
          {hasNewProperties && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                ...(isLeft ? { left: 4 } : { right: 4 }),
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#0a7e7a',
                animation: 'glow-pulse 0.6s ease-in-out 3',
              }}
              data-testid="panel-badge"
            />
          )}
        </button>
      </div>
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
        {isLeft && (
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
            ◀
          </button>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: UI_TEXT_SECONDARY }}>Propriétés</span>
        {!isLeft && (
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
        )}
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
        {state.segments.map((seg, index) => {
          const start = state.points.find((p) => p.id === seg.startPointId);
          const end = state.points.find((p) => p.id === seg.endPointId);
          if (!start || !end) return null;
          const label = `${start.label}${end.label}`;
          const prefix = figureSegmentIds.has(seg.id) ? 'Côté' : 'Segment';
          const isSelected = seg.id === state.selectedElementId;
          const isHovered = seg.id === hoveredElementId;
          const zebra = index % 2 !== 0 ? '#F8FAFC' : 'transparent';
          const bg = isSelected ? '#E8F0FA' : isHovered ? '#F0F4F8' : zebra;

          return (
            <div
              key={seg.id}
              onClick={() => onSelectElement(seg.id)}
              onPointerEnter={() => onHoverElement?.(seg.id)}
              onPointerLeave={() => onHoverElement?.(null)}
              style={{
                padding: '2px 4px',
                cursor: 'pointer',
                color: UI_TEXT_PRIMARY,
                background: bg,
                borderRadius: 2,
              }}
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
        {(() => {
          // Pre-compute vertex angle counts for conditional 3-letter notation
          const vertexAngleCounts = new Map<string, number>();
          for (const a of angles) {
            vertexAngleCounts.set(
              a.vertexPointId,
              (vertexAngleCounts.get(a.vertexPointId) ?? 0) + 1,
            );
          }

          return angles.map((angle, i) => {
            const vertex = state.points.find((p) => p.id === angle.vertexPointId);
            if (!vertex) return null;
            const ray1 = state.points.find((p) => p.id === angle.ray1PointId);
            const ray2 = state.points.find((p) => p.id === angle.ray2PointId);
            if (!ray1 || !ray2) return null;

            // Use 3-letter notation when vertex has multiple angles (disambiguation)
            const needsDisambiguation = (vertexAngleCounts.get(angle.vertexPointId) ?? 0) > 1;
            const angleLabel = needsDisambiguation
              ? `∠${ray1.label}${vertex.label}${ray2.label}`
              : `∠${vertex.label}`;

            const isHovered = angle.vertexPointId === hoveredElementId;
            const zebra = i % 2 !== 0 ? '#F8FAFC' : 'transparent';
            const bg = isHovered ? '#F0F4F8' : zebra;

            return (
              <div
                key={i}
                onClick={() => onSelectElement(angle.vertexPointId)}
                onPointerEnter={() => onHoverElement?.(angle.vertexPointId)}
                onPointerLeave={() => onHoverElement?.(null)}
                style={{
                  padding: '2px 4px',
                  cursor: 'pointer',
                  color: UI_TEXT_PRIMARY,
                  background: bg,
                  borderRadius: 2,
                }}
              >
                <span>{angleLabel}</span>
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
          });
        })()}
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

        {hideProperties && (properties.length > 0 || figures.length > 0) && (
          <button
            onClick={onToggleHideProperties}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: UI_PRIMARY,
              color: '#FFF',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
            data-testid="verify-properties-btn"
          >
            Vérifier les propriétés
          </button>
        )}

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
            {figures
              .filter((f) => !f.minor)
              .map((fig) => (
                <div key={fig.id} style={{ padding: '2px 0' }}>
                  <div style={{ color: UI_PRIMARY, fontWeight: 600 }}>{fig.name}</div>
                </div>
              ))}
            {(() => {
              const minorFigures = figures.filter((f) => f.minor);
              return minorFigures.length > 0 ? (
                <details style={{ marginTop: 4 }}>
                  <summary
                    style={{ cursor: 'pointer', color: UI_TEXT_SECONDARY, fontSize: '0.9em' }}
                  >
                    Autres polygones ({minorFigures.length})
                  </summary>
                  {minorFigures.map((fig) => (
                    <div key={fig.id} style={{ padding: '2px 0' }}>
                      <div style={{ color: UI_TEXT_SECONDARY }}>{fig.name}</div>
                    </div>
                  ))}
                </details>
              ) : null;
            })()}
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
                    Rayon : {formatLength(circle.radiusMm, state.displayUnit)}, Diamètre :{' '}
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
        {state.points.map((point, index) => {
          const prefix = figurePointIds.has(point.id) ? 'Sommet' : 'Point';
          const isSelected = point.id === state.selectedElementId;
          const isHovered = point.id === hoveredElementId;
          const zebra = index % 2 !== 0 ? '#F8FAFC' : 'transparent';
          const bg = isSelected ? '#E8F0FA' : isHovered ? '#F0F4F8' : zebra;
          return (
            <div
              key={point.id}
              onClick={() => onSelectElement(point.id)}
              onPointerEnter={() => onHoverElement?.(point.id)}
              onPointerLeave={() => onHoverElement?.(null)}
              style={{
                padding: '2px 4px',
                cursor: 'pointer',
                color: UI_TEXT_PRIMARY,
                background: bg,
                borderRadius: 2,
              }}
            >
              <span>
                {prefix} {point.label}
              </span>
              {point.locked && <span style={{ color: UI_TEXT_SECONDARY, marginLeft: 4 }}>🔒</span>}
              {state.cartesianMode !== 'off' &&
                (() => {
                  const originX = state.cartesianMode === '1quadrant' ? 0 : BOUNDS_WIDTH_MM / 2;
                  const originY =
                    state.cartesianMode === '1quadrant' ? BOUNDS_HEIGHT_MM : BOUNDS_HEIGHT_MM / 2;
                  const cx = point.x - originX;
                  const cy = originY - point.y;
                  return (
                    <span style={{ color: UI_TEXT_SECONDARY, marginLeft: 6, fontSize: '0.9em' }}>
                      ({formatLength(cx, state.displayUnit)}, {formatLength(cy, state.displayUnit)})
                    </span>
                  );
                })()}
            </div>
          );
        })}
      </AccordionSection>
    </div>
  );
});
