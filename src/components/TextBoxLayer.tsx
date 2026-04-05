/**
 * TextBoxLayer — renders free-form text boxes on the canvas SVG.
 */

import { memo } from 'react';
import type { TextBox, ViewportState } from '@/model/types';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { UI_PRIMARY, UI_BORDER, UI_TEXT_PRIMARY } from '@/config/theme';
import { MIN_CANVAS_FONT_PX } from '@/config/accessibility';

interface TextBoxLayerProps {
  readonly textBoxes: readonly TextBox[];
  readonly viewport: ViewportState;
  readonly selectedElementId: string | null;
  readonly fontScale?: number;
  readonly onDoubleClick?: (id: string) => void;
}

/** Approximate text width in mm based on character count. */
function estimateWidthMm(text: string, fontSizeMm: number): number {
  const lines = text.split('\n');
  const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
  return Math.max(30, longestLine.length * fontSizeMm * 0.55 + 6);
}

export const TextBoxLayer = memo(function TextBoxLayer({
  textBoxes,
  viewport,
  selectedElementId,
  fontScale = 1,
  onDoubleClick,
}: TextBoxLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const fontSizeMm = Math.max(MIN_CANVAS_FONT_PX / pxPerMm, 3.5) * fontScale;
  const lineHeightMm = fontSizeMm * 1.4;

  return (
    <g data-testid="textbox-layer">
      {textBoxes.map((tb) => {
        const sx = (tb.x - viewport.panX) * pxPerMm;
        const sy = (tb.y - viewport.panY) * pxPerMm;
        const isSelected = tb.id === selectedElementId;
        const lines = (tb.text || '…').split('\n');
        const widthMm = estimateWidthMm(tb.text || '…', fontSizeMm);
        const widthPx = widthMm * pxPerMm;
        const heightMm = lines.length * lineHeightMm + 3;
        const heightPx = heightMm * pxPerMm;
        const paddingPx = 3 * pxPerMm;

        return (
          <g
            key={tb.id}
            data-testid={`textbox-${tb.id}`}
            onDoubleClick={() => onDoubleClick?.(tb.id)}
            style={{ cursor: 'text' }}
          >
            {/* Background rect */}
            <rect
              x={sx - paddingPx}
              y={sy - paddingPx}
              width={widthPx + paddingPx * 2}
              height={heightPx + paddingPx}
              rx={3}
              fill="rgba(255,255,255,0.9)"
              stroke={isSelected ? UI_PRIMARY : UI_BORDER}
              strokeWidth={isSelected ? 2 : 1}
            />
            {/* Text lines */}
            <text
              x={sx}
              y={sy + fontSizeMm * pxPerMm * 0.85}
              fontSize={fontSizeMm * pxPerMm}
              fontFamily="system-ui, sans-serif"
              fill={tb.text ? UI_TEXT_PRIMARY : '#9CA3AF'}
              pointerEvents="none"
            >
              {lines.map((line, i) => (
                <tspan key={i} x={sx} dy={i === 0 ? 0 : lineHeightMm * pxPerMm}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </g>
  );
});
