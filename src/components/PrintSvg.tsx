import { memo } from 'react';
import type { ConstructionState } from '@/model/types';
import { formatLength } from '@/engine/format';
import { getPrintableArea, witnessSegmentCoords, footerCoords } from '@/engine/print-shared';
import type { PageFormat } from '@/model/preferences';

interface PrintSvgProps {
  readonly state: ConstructionState;
  readonly landscape: boolean;
  readonly pageFormat?: PageFormat;
}

/**
 * Dedicated print SVG — display:none normally, display:block in @media print.
 * viewBox in mm (D5), B&W, witness segment, footer.
 */
export const PrintSvg = memo(function PrintSvg({
  state,
  landscape,
  pageFormat = 'letter',
}: PrintSvgProps) {
  const area = getPrintableArea(pageFormat, landscape);
  const pw = area.width;
  const ph = area.height;
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const ws = witnessSegmentCoords(landscape, pageFormat);
  const ft = footerCoords(landscape, pageFormat);

  return (
    <svg
      className="print-svg"
      width={`${pw}mm`}
      height={`${ph}mm`}
      viewBox={`0 0 ${pw} ${ph}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'none' }}
      data-testid="print-svg"
    >
      {/* Segments */}
      {state.segments.map((seg) => {
        const start = pointMap.get(seg.startPointId);
        const end = pointMap.get(seg.endPointId);
        if (!start || !end) return null;

        const mx = (start.x + end.x) / 2;
        const my = (start.y + end.y) / 2;

        return (
          <g key={seg.id}>
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#000" strokeWidth={0.5} />
            <text x={mx + 2} y={my - 2} fontSize={2.8} fill="#333">
              {formatLength(seg.lengthMm, state.displayUnit)}
            </text>
          </g>
        );
      })}

      {/* Circles */}
      {state.circles.map((circle) => {
        const center = pointMap.get(circle.centerPointId);
        if (!center) return null;
        return (
          <circle
            key={circle.id}
            cx={center.x}
            cy={center.y}
            r={circle.radiusMm}
            fill="none"
            stroke="#000"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Points */}
      {state.points.map((point) => (
        <g key={point.id}>
          <circle cx={point.x} cy={point.y} r={1} fill="#000" />
          <text x={point.x + 2} y={point.y - 2} fontSize={3.5} fill="#000">
            {point.label}
          </text>
        </g>
      ))}

      {/* Witness segment */}
      <line x1={ws.x1} y1={ws.y1} x2={ws.x2} y2={ws.y2} stroke="#000" strokeWidth={0.5} />
      <text x={ws.labelX} y={ws.labelY} fontSize={2.5} fill="#999" textAnchor="middle">
        vérification : ce segment mesure 5 cm
      </text>

      {/* Footer */}
      <text x={ft.x} y={ft.y} fontSize={2.5} fill="#999">
        TraceVite — Échelle 1:1
      </text>
    </svg>
  );
});
