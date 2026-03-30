import { memo } from 'react';
import type { ToolType, GridSize, DisplayUnit, SchoolLevel } from '@/model/types';
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
  TOOL_SEGMENT,
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
  readonly schoolLevel: SchoolLevel;
  readonly onToolChange: (tool: ToolType) => void;
  readonly onGridChange: (size: GridSize) => void;
  readonly onUnitChange: (unit: DisplayUnit) => void;
  readonly onSnapToggle: () => void;
}

const toolBtnBase: React.CSSProperties = {
  minWidth: MIN_BUTTON_SIZE_PX,
  height: MIN_BUTTON_SIZE_PX,
  padding: '0 10px',
  border: '1px solid transparent',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  background: 'transparent',
  color: UI_TEXT_PRIMARY,
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
  schoolLevel,
  onToolChange,
  onGridChange,
  onUnitChange,
  onSnapToggle,
}: ToolbarProps) {
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
        {TOOL_SEGMENT}
      </button>
      <button
        onClick={() => onToolChange('move')}
        style={{ ...toolBtnBase, ...(activeTool === 'move' ? activeStyle : {}) }}
        aria-pressed={activeTool === 'move'}
        data-testid="tool-move"
      >
        {TOOL_MOVE}
      </button>
      {/* Circle — 3e cycle only */}
      {schoolLevel === '3e_cycle' && (
        <button
          onClick={() => onToolChange('circle')}
          style={{ ...toolBtnBase, ...(activeTool === 'circle' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'circle'}
          data-testid="tool-circle"
        >
          {TOOL_CIRCLE}
        </button>
      )}
      <button
        onClick={() => onToolChange('reflection')}
        style={{ ...toolBtnBase, ...(activeTool === 'reflection' ? activeStyle : {}) }}
        aria-pressed={activeTool === 'reflection'}
        data-testid="tool-reflection"
      >
        {TOOL_REFLECTION}
      </button>
      <button
        onClick={() => onToolChange('measure')}
        style={{ ...toolBtnBase, ...(activeTool === 'measure' ? activeStyle : {}) }}
        aria-pressed={activeTool === 'measure'}
        data-testid="tool-measure"
      >
        {TOOL_MEASURE}
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />

      {/* Grid selector */}
      <div style={{ display: 'flex', gap: 2 }}>
        {([5, 10, 20] as GridSize[]).map((size) => (
          <button
            key={size}
            onClick={() => onGridChange(size)}
            style={{
              ...toolBtnBase,
              minWidth: 36,
              padding: '0 6px',
              fontSize: 12,
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

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />

      {/* Unit toggle */}
      <button
        onClick={() => onUnitChange(displayUnit === 'cm' ? 'mm' : 'cm')}
        style={{ ...toolBtnBase, minWidth: 36, fontSize: 12 }}
        data-testid="unit-toggle"
      >
        {displayUnit}
      </button>

      {/* Snap toggle */}
      <button
        onClick={onSnapToggle}
        style={{
          ...toolBtnBase,
          fontSize: 12,
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
