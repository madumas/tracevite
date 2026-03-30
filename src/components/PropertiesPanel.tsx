import { memo } from 'react';
import type {
  ConstructionState,
  AngleInfo,
  DetectedProperty,
  SchoolLevel,
  DisplayUnit,
} from '@/model/types';
import type { Figure } from '@/engine/figures';
import { AccordionSection } from './AccordionSection';
import {
  PANEL_WIDTH,
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
  readonly schoolLevel: SchoolLevel;
  readonly hideProperties: boolean;
  readonly onToggleHideProperties: () => void;
  readonly onSelectElement: (elementId: string) => void;
  readonly collapsed: boolean;
  readonly onToggleCollapsed: () => void;
  readonly hasNewProperties?: boolean;
}

export const PropertiesPanel = memo(function PropertiesPanel({
  state,
  angles,
  properties,
  figures,
  schoolLevel,
  hideProperties,
  onToggleHideProperties,
  onSelectElement,
  collapsed,
  onToggleCollapsed,
  hasNewProperties,
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

  return (
    <div
      style={{
        width: PANEL_WIDTH,
        background: UI_SURFACE,
        borderLeft: `1px solid ${UI_BORDER}`,
        overflowY: 'auto',
        flexShrink: 0,
        fontSize: 12,
        position: 'relative',
      }}
      data-testid="properties-panel"
    >
      {/* Collapse button */}
      <button
        onClick={onToggleCollapsed}
        style={{
          position: 'absolute',
          right: 4,
          top: 4,
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

      {/* Segments / Côtés */}
      <AccordionSection title="Segments" defaultOpen>
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
              <span style={{ color: UI_TEXT_SECONDARY, marginLeft: 6 }}>
                {formatLength(seg.lengthMm, state.displayUnit)}
              </span>
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
                {schoolLevel === '3e_cycle' ? `${Math.round(angle.degrees)}°` : ''}{' '}
                {angle.classification === 'droit'
                  ? '(droit)'
                  : angle.classification === 'aigu'
                    ? '(aigu)'
                    : angle.classification === 'obtus'
                      ? '(obtus)'
                      : angle.classification === 'plat'
                        ? schoolLevel === '2e_cycle'
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
              <div key={fig.id} style={{ padding: '2px 0', color: UI_PRIMARY, fontWeight: 600 }}>
                {fig.name}
              </div>
            ))}
            {properties.length === 0 && figures.length === 0 && (
              <div style={{ color: UI_TEXT_SECONDARY, fontStyle: 'italic' }}>Aucune propriété</div>
            )}
          </>
        )}
      </AccordionSection>

      {/* Mesures */}
      {!hideProperties && figures.length > 0 && (
        <AccordionSection title="Mesures">
          {figures.map((fig) => (
            <div key={fig.id} style={{ padding: '2px 0', color: UI_TEXT_PRIMARY }}>
              <div style={{ fontWeight: 500 }}>{fig.name}</div>
              <div style={{ color: UI_TEXT_SECONDARY }}>
                Périmètre : {formatLength(fig.perimeterMm, state.displayUnit)}
              </div>
              {fig.areaMm2 !== null ? (
                <div style={{ color: UI_TEXT_SECONDARY }}>
                  Aire : {formatArea(fig.areaMm2, state.displayUnit)}
                </div>
              ) : fig.selfIntersecting ? (
                <div style={{ color: UI_TEXT_SECONDARY, fontStyle: 'italic' }}>
                  Figure croisée — aire non calculée
                </div>
              ) : (
                <div style={{ color: UI_TEXT_SECONDARY }}>Aire : —</div>
              )}
            </div>
          ))}
        </AccordionSection>
      )}

      {/* Points / Sommets */}
      <AccordionSection title="Points">
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

function formatArea(areaMm2: number, unit: DisplayUnit): string {
  if (unit === 'cm') {
    const cm2 = areaMm2 / 100;
    return `${cm2.toFixed(1).replace('.', ',')} cm²`;
  }
  return `${areaMm2.toFixed(1).replace('.', ',')} mm²`;
}
