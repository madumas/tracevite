import { memo, useState, useEffect, useRef, useCallback } from 'react';
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
  ReproduceIcon,
  PerpendicularIcon,
  ParallelIcon,
  TranslationIcon,
  CompareIcon,
  SnapIcon,
} from './ToolIcons';
import {
  TOOL_SEGMENT,
  TOOL_POINT,
  TOOL_MOVE,
  TOOL_CIRCLE,
  TOOL_REFLECTION,
  TOOL_COMPARE,
  TOOL_SNAP,
  GRID_5MM,
  GRID_1CM,
  GRID_2CM,
} from '@/config/messages';
import { SaveIndicator } from './SaveIndicator';
import { ModeSelector } from './ModeSelector';

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
  readonly onTutorialStart?: () => void;
  readonly saving?: boolean;
  readonly demoMode?: boolean;
  readonly onShowAbout?: () => void;
  readonly onModeChange?: (mode: DisplayMode) => void;
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
  onTutorialStart,
  saving = false,
  demoMode = false,
  onShowAbout,
  onModeChange,
}: ToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isSimple = displayMode === 'simplifie';

  // Auto-scroll toolbar to show active tool button on mobile
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView?.({
      inline: 'center',
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeTool]);

  // Helper: ref only for the active tool button
  const refIfActive = useCallback(
    (tool: ToolType) => (activeTool === tool ? activeButtonRef : undefined),
    [activeTool],
  );

  return (
    <div
      style={{
        height: TOOLBAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        background: UI_SURFACE,
        borderBottom: `1px solid ${UI_BORDER}`,
        fontSize: 13 * fontScale,
      }}
      role="toolbar"
      aria-label="Outils de construction"
      data-testid="toolbar"
    >
      {/* Zone scrollable — logo, save, tools, grid, unit, snap */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          overflowX: 'auto',
          padding: '0 8px',
          gap: MIN_BUTTON_GAP_PX,
        }}
        data-testid="toolbar-scroll"
      >
        {/* Logo + About */}
        {!demoMode && onShowAbout && (
          <button
            onClick={onShowAbout}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="À propos de TraceVite"
          >
            <img src="/logo.svg" alt="" width={24} height={24} />
          </button>
        )}
        {!demoMode && <SaveIndicator saving={saving} compact />}

        {/* Separator */}
        {!demoMode && (
          <div
            style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px', flexShrink: 0 }}
          />
        )}

        {/* Tool buttons */}
        <button
          ref={refIfActive('segment')}
          onClick={() => onToolChange('segment')}
          style={{ ...toolBtnBase, ...(activeTool === 'segment' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'segment'}
          data-testid="tool-segment"
        >
          <SegmentIcon /> <span className="tool-label">{TOOL_SEGMENT}</span>
        </button>
        {/* Point — hidden by default, activable via settings (spec §6.2) */}
        {pointToolVisible && (
          <button
            onClick={() => onToolChange('point')}
            style={{ ...toolBtnBase, ...(activeTool === 'point' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'point'}
            data-testid="tool-point"
          >
            <PointIcon /> <span className="tool-label">{TOOL_POINT}</span>
          </button>
        )}
        <button
          onClick={() => onToolChange('move')}
          style={{ ...toolBtnBase, ...(activeTool === 'move' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'move'}
          data-testid="tool-move"
        >
          <MoveIcon /> <span className="tool-label">{TOOL_MOVE}</span>
        </button>
        {/* Circle — 3e cycle only */}
        {displayMode === 'complet' && (
          <button
            onClick={() => onToolChange('circle')}
            style={{ ...toolBtnBase, ...(activeTool === 'circle' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'circle'}
            data-testid="tool-circle"
          >
            <CircleIcon /> <span className="tool-label">{TOOL_CIRCLE}</span>
          </button>
        )}
        <button
          onClick={() => onToolChange('reflection')}
          style={{ ...toolBtnBase, ...(activeTool === 'reflection' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'reflection'}
          data-testid="tool-reflection"
        >
          <ReflectionIcon /> <span className="tool-label">{TOOL_REFLECTION}</span>
        </button>
        {/* Reproduce — behind "Plus d'outils" in simplifie */}
        {(!isSimple || moreOpen) && (
          <button
            onClick={() => onToolChange('reproduce')}
            style={{ ...toolBtnBase, ...(activeTool === 'reproduce' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'reproduce'}
            data-testid="tool-reproduce"
          >
            <ReproduceIcon /> <span className="tool-label">Reproduire</span>
          </button>
        )}
        {/* Compare — behind "Plus d'outils" in simplifie */}
        {(!isSimple || moreOpen) && (
          <button
            onClick={() => onToolChange('compare')}
            style={{ ...toolBtnBase, ...(activeTool === 'compare' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'compare'}
            data-testid="tool-compare"
          >
            <CompareIcon /> <span className="tool-label">{TOOL_COMPARE}</span>
          </button>
        )}
        {/* Perpendicular — behind "Plus d'outils" in simplifie */}
        {(!isSimple || moreOpen) && (
          <button
            onClick={() => onToolChange('perpendicular')}
            style={{ ...toolBtnBase, ...(activeTool === 'perpendicular' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'perpendicular'}
            data-testid="tool-perpendicular"
          >
            <PerpendicularIcon /> <span className="tool-label">Perpendiculaire</span>
          </button>
        )}
        {/* Parallel — behind "Plus d'outils" in simplifie */}
        {(!isSimple || moreOpen) && (
          <button
            onClick={() => onToolChange('parallel')}
            style={{ ...toolBtnBase, ...(activeTool === 'parallel' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'parallel'}
            data-testid="tool-parallel"
          >
            <ParallelIcon /> <span className="tool-label">Parallèle</span>
          </button>
        )}
        {/* Translation — complet only (3e cycle) */}
        {!isSimple && (
          <button
            onClick={() => onToolChange('translation')}
            style={{ ...toolBtnBase, ...(activeTool === 'translation' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'translation'}
            data-testid="tool-translation"
          >
            <TranslationIcon /> <span className="tool-label">Translation</span>
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

        {/* Snap toggle — always visible, LED indicator for state */}
        <button
          onClick={onSnapToggle}
          style={{
            ...toolBtnBase,
            fontSize: 'inherit',
            color: snapEnabled ? UI_PRIMARY : UI_DISABLED_TEXT,
            fontWeight: snapEnabled ? 600 : 400,
            position: 'relative',
          }}
          aria-pressed={snapEnabled}
          data-testid="snap-toggle"
          title={snapEnabled ? 'Aimant activé' : 'Aimant désactivé'}
        >
          <SnapIcon /> {TOOL_SNAP}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: snapEnabled ? '#22C55E' : '#D1D8E0',
              display: 'inline-block',
              marginLeft: 4,
            }}
          />
        </button>
      </div>
      {/* end zone scrollable */}

      {/* Zone fixe droite — ModeSelector + aide (pas clippée par overflow) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          padding: '0 8px',
          gap: MIN_BUTTON_GAP_PX,
        }}
      >
        {!demoMode && onModeChange && <ModeSelector mode={displayMode} onChange={onModeChange} />}

        {onTutorialStart && (
          <button
            onClick={onTutorialStart}
            style={{
              ...toolBtnBase,
              minWidth: MIN_BUTTON_SIZE_PX,
              padding: 0,
              justifyContent: 'center',
              color: UI_TEXT_PRIMARY,
              fontSize: 'inherit',
            }}
            aria-label="Aide — tutoriel"
            data-testid="help-tutorial"
          >
            ?
          </button>
        )}
      </div>
    </div>
  );
});
