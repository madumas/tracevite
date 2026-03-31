import { memo, useState } from 'react';
import type { ToolType, GridSize, DisplayUnit, DisplayMode } from '@/model/types';
import {
  UI_PRIMARY,
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_DISABLED_TEXT,
  TOOLBAR_HEIGHT,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '@/config/accessibility';
import {
  SegmentIcon,
  PointIcon,
  CircleIcon,
  MoveIcon,
  ReflectionIcon,
  LengthIcon,
} from './ToolIcons';
import {
  TOOL_SEGMENT,
  TOOL_POINT,
  TOOL_MOVE,
  TOOL_MEASURE,
  TOOL_CIRCLE,
  TOOL_REFLECTION,
  TOOL_SNAP,
  GRID_5MM,
  GRID_1CM,
  GRID_2CM,
} from '@/config/messages';

interface ToolbarProps {
  readonly activeTool: ToolType;
  readonly gridSizeMm: GridSize;
  readonly displayUnit: DisplayUnit;
  readonly snapEnabled: boolean;
  readonly displayMode: DisplayMode;
  readonly onToolChange: (tool: ToolType) => void;
  readonly onGridChange: (size: GridSize) => void;
  readonly onUnitChange: (unit: DisplayUnit) => void;
  readonly onSnapToggle: () => void;
  readonly pointToolVisible: boolean;
  readonly fontScale?: number;
}

const toolBtnBase: React.CSSProperties = {
  minWidth: MIN_BUTTON_SIZE_PX,
  height: MIN_BUTTON_SIZE_PX,
  padding: '0 10px',
  border: '1px solid transparent',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 500,
  background: 'transparent',
  color: UI_TEXT_PRIMARY,
  fontSize: 'inherit',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const activeStyle: React.CSSProperties = {
  border: `2px solid ${UI_PRIMARY}`,
  background: '#E8F0FA',
};

export const Toolbar = memo(function Toolbar({
  activeTool,
  gridSizeMm,
  displayUnit,
  snapEnabled,
  displayMode,
  onToolChange,
  onGridChange,
  onUnitChange,
  onSnapToggle,
  pointToolVisible,
  fontScale = 1,
}: ToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isSimple = displayMode === 'simplifie';

  return (
    <div
      style={{
        height: TOOLBAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        background: UI_SURFACE,
        borderBottom: `1px solid ${UI_BORDER}`,
        gap: MIN_BUTTON_GAP_PX,
        fontSize: 13 * fontScale,
      }}
      role="toolbar"
      aria-label="Outils de construction"
      data-testid="toolbar"
    >
      {/* Tool buttons */}
      <button
        onClick={() => onToolChange('segment')}
        style={{ ...toolBtnBase, ...(activeTool === 'segment' ? activeStyle : {}) }}
        aria-pressed={activeTool === 'segment'}
        data-testid="tool-segment"
      >
        <SegmentIcon /> {TOOL_SEGMENT}
      </button>
      {/* Point — hidden by default, activable via settings (spec §6.2) */}
      {pointToolVisible && (
        <button
          onClick={() => onToolChange('point')}
          style={{ ...toolBtnBase, ...(activeTool === 'point' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'point'}
          data-testid="tool-point"
        >
          <PointIcon /> {TOOL_POINT}
        </button>
      )}
      <button
        onClick={() => onToolChange('move')}
        style={{ ...toolBtnBase, ...(activeTool === 'move' ? activeStyle : {}) }}
        aria-pressed={activeTool === 'move'}
        data-testid="tool-move"
      >
        <MoveIcon /> {TOOL_MOVE}
      </button>
      {/* Circle — 3e cycle only */}
      {displayMode === 'complet' && (
        <button
          onClick={() => onToolChange('circle')}
          style={{ ...toolBtnBase, ...(activeTool === 'circle' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'circle'}
          data-testid="tool-circle"
        >
          <CircleIcon /> {TOOL_CIRCLE}
        </button>
      )}
      <button
        onClick={() => onToolChange('reflection')}
        style={{ ...toolBtnBase, ...(activeTool === 'reflection' ? activeStyle : {}) }}
        aria-pressed={activeTool === 'reflection'}
        data-testid="tool-reflection"
      >
        <ReflectionIcon /> {TOOL_REFLECTION}
      </button>
      {/* Reproduce — behind "Plus d'outils" in simplifie */}
      {(!isSimple || moreOpen) && (
        <button
          onClick={() => onToolChange('reproduce')}
          style={{ ...toolBtnBase, ...(activeTool === 'reproduce' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'reproduce'}
          data-testid="tool-reproduce"
        >
          Reproduire
        </button>
      )}
      {/* Measure — always visible in complet, behind "Plus d'outils" in simplifie */}
      {(!isSimple || moreOpen) && (
        <button
          onClick={() => onToolChange('measure')}
          style={{ ...toolBtnBase, ...(activeTool === 'measure' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'measure'}
          data-testid="tool-measure"
        >
          <LengthIcon /> {TOOL_MEASURE}
        </button>
      )}

      {/* "Plus d'outils" toggle (2e cycle only, spec §10) */}
      {isSimple && (
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          style={{
            ...toolBtnBase,
            fontSize: 'inherit',
            color: moreOpen ? UI_PRIMARY : UI_TEXT_PRIMARY,
          }}
          aria-expanded={moreOpen}
          data-testid="more-tools"
        >
          ⋯
        </button>
      )}

      {/* Separator */}
      {(!isSimple || moreOpen) && (
        <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />
      )}

      {/* Grid selector — always visible in complet, behind "Plus d'outils" in simplifie */}
      {(!isSimple || moreOpen) && (
        <div style={{ display: 'flex', gap: 2 }}>
          {([5, 10, 20] as GridSize[]).map((size) => (
            <button
              key={size}
              onClick={() => onGridChange(size)}
              style={{
                ...toolBtnBase,
                minWidth: 36,
                padding: '0 6px',
                fontSize: 'inherit',
                background: gridSizeMm === size ? '#E8F0FA' : 'transparent',
                border: gridSizeMm === size ? `1px solid ${UI_PRIMARY}` : `1px solid transparent`,
              }}
              aria-pressed={gridSizeMm === size}
              data-testid={`grid-${size}`}
            >
              {size === 5 ? GRID_5MM : size === 10 ? GRID_1CM : GRID_2CM}
            </button>
          ))}
        </div>
      )}

      {/* Separator */}
      {(!isSimple || moreOpen) && (
        <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />
      )}

      {/* Unit toggle */}
      {(!isSimple || moreOpen) && (
        <button
          onClick={() => onUnitChange(displayUnit === 'cm' ? 'mm' : 'cm')}
          style={{ ...toolBtnBase, minWidth: 36 }}
          data-testid="unit-toggle"
        >
          {displayUnit}
        </button>
      )}

      {/* Snap toggle — always visible */}
      <button
        onClick={onSnapToggle}
        style={{
          ...toolBtnBase,
          fontSize: 'inherit',
          color: snapEnabled ? UI_PRIMARY : UI_DISABLED_TEXT,
          fontWeight: snapEnabled ? 600 : 400,
        }}
        aria-pressed={snapEnabled}
        data-testid="snap-toggle"
      >
        {TOOL_SNAP}
      </button>
    </div>
  );
});
