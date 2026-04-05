import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { ToolType, DisplayMode } from '@/model/types';
import { UI_PRIMARY, UI_SURFACE, UI_BORDER, UI_TEXT_PRIMARY, TOOLBAR_HEIGHT } from '@/config/theme';
import { GeoMoloLogo } from './GeoMoloLogo';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '@/config/accessibility';
import {
  SelectIcon,
  TextIcon,
  SegmentIcon,
  PointIcon,
  CircleIcon,
  MoveIcon,
  ReflectionIcon,
  ReproduceIcon,
  PerpendicularIcon,
  ParallelIcon,
  TranslationIcon,
  RotationIcon,
  HomothetyIcon,
  CompareIcon,
  FriezeIcon,
  SymmetryIcon,
} from './ToolIcons';
import {
  TOOL_SEGMENT,
  TOOL_POINT,
  TOOL_MOVE,
  TOOL_SELECT,
  TOOL_CIRCLE,
  TOOL_REFLECTION,
  TOOL_COMPARE,
} from '@/config/messages';
import { ModeSelector } from './ModeSelector';

interface ToolbarProps {
  readonly activeTool: ToolType;
  readonly displayMode: DisplayMode;
  readonly onToolChange: (tool: ToolType) => void;
  readonly pointToolVisible: boolean;
  readonly fontScale?: number;
  readonly demoMode?: boolean;
  readonly onShowAbout?: () => void;
  readonly onModeChange?: (mode: DisplayMode) => void;
}

const toolBtnBase: React.CSSProperties = {
  minWidth: MIN_BUTTON_SIZE_PX,
  height: 56,
  padding: '4px 8px',
  border: '1px solid transparent',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 500,
  background: 'transparent',
  color: UI_TEXT_PRIMARY,
  fontSize: 11,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};

const activeStyle: React.CSSProperties = {
  border: `2px solid ${UI_PRIMARY}`,
  background: '#E8F0FA',
};

export const Toolbar = memo(function Toolbar({
  activeTool,
  displayMode,
  onToolChange,
  pointToolVisible,
  fontScale = 1,
  demoMode = false,
  onShowAbout,
  onModeChange,
}: ToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isSimple = displayMode === 'simplifie';
  const isNarrowToolbar = useMediaQuery('(max-width: 1200px)');
  // In Complet mode on narrow screens, hide some tools behind "Plus d'outils"
  const needsOverflow = isSimple || (!isSimple && isNarrowToolbar);

  // Reset "Plus d'outils" when switching display mode
  useEffect(() => setMoreOpen(false), [displayMode]);

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
      data-toolbar-mode={displayMode}
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
            aria-label="À propos de GéoMolo"
          >
            <GeoMoloLogo height={32} />
          </button>
        )}

        {/* Separator */}
        {!demoMode && (
          <div
            style={{
              width: 2,
              height: 28,
              background: UI_BORDER,
              margin: '0 6px',
              flexShrink: 0,
              borderRadius: 1,
              opacity: 0.6,
            }}
          />
        )}

        {/* ═══ GROUP: Construire ═══ */}
        <button
          ref={refIfActive('segment')}
          onClick={() => onToolChange('segment')}
          style={{ ...toolBtnBase, ...(activeTool === 'segment' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'segment'}
          data-testid="tool-segment"
        >
          <SegmentIcon /> <span className="tool-label">{TOOL_SEGMENT}</span>
        </button>
        {/* Text — always visible */}
        <button
          ref={refIfActive('text')}
          onClick={() => onToolChange('text')}
          style={{ ...toolBtnBase, ...(activeTool === 'text' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'text'}
          data-testid="tool-text"
        >
          <TextIcon /> <span className="tool-label">Texte</span>
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

        {/* ─ sep ─ */}
        <div
          style={{
            width: 2,
            height: 28,
            background: UI_BORDER,
            margin: '0 6px',
            flexShrink: 0,
            borderRadius: 1,
            opacity: 0.6,
          }}
        />

        {/* ═══ GROUP: Transformer ═══ */}
        {/* Perpendicular — behind "Plus d'outils" in simplifie */}
        {(!needsOverflow || moreOpen) && (
          <button
            ref={refIfActive('perpendicular')}
            onClick={() => onToolChange('perpendicular')}
            style={{ ...toolBtnBase, ...(activeTool === 'perpendicular' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'perpendicular'}
            data-testid="tool-perpendicular"
          >
            <PerpendicularIcon /> <span className="tool-label">Perpendiculaire</span>
          </button>
        )}
        {/* Parallel — behind "Plus d'outils" in simplifie */}
        {(!needsOverflow || moreOpen) && (
          <button
            ref={refIfActive('parallel')}
            onClick={() => onToolChange('parallel')}
            style={{ ...toolBtnBase, ...(activeTool === 'parallel' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'parallel'}
            data-testid="tool-parallel"
          >
            <ParallelIcon /> <span className="tool-label">Parallèle</span>
          </button>
        )}
        {/* ─ thin sep (Construire lignes | Transformer figures) ─ */}
        {(!needsOverflow || moreOpen) && (
          <div
            style={{
              width: 1,
              height: 20,
              background: UI_BORDER,
              margin: '0 3px',
              flexShrink: 0,
              opacity: 0.35,
            }}
          />
        )}
        <button
          ref={refIfActive('reflection')}
          onClick={() => onToolChange('reflection')}
          style={{ ...toolBtnBase, ...(activeTool === 'reflection' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'reflection'}
          data-testid="tool-reflection"
        >
          <ReflectionIcon /> <span className="tool-label">{TOOL_REFLECTION}</span>
        </button>
        {/* Reproduce — behind "Plus d'outils" in simplifie */}
        {(!needsOverflow || moreOpen) && (
          <button
            ref={refIfActive('reproduce')}
            onClick={() => onToolChange('reproduce')}
            style={{ ...toolBtnBase, ...(activeTool === 'reproduce' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'reproduce'}
            data-testid="tool-reproduce"
          >
            <ReproduceIcon /> <span className="tool-label">Reproduire</span>
          </button>
        )}
        {/* Frieze — behind "Plus d'outils" in simplifie */}
        {(!needsOverflow || moreOpen) && (
          <button
            ref={refIfActive('frieze')}
            onClick={() => onToolChange('frieze')}
            style={{ ...toolBtnBase, ...(activeTool === 'frieze' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'frieze'}
            data-testid="tool-frieze"
          >
            <FriezeIcon /> <span className="tool-label">Frise</span>
          </button>
        )}
        {/* ─ thin sep (Copier | Transformer 3e cycle) ─ */}
        {!isSimple && (
          <div
            style={{
              width: 1,
              height: 20,
              background: UI_BORDER,
              margin: '0 3px',
              flexShrink: 0,
              opacity: 0.35,
            }}
          />
        )}
        {/* Translation — complet only (3e cycle) */}
        {!isSimple && (
          <button
            ref={refIfActive('translation')}
            onClick={() => onToolChange('translation')}
            style={{ ...toolBtnBase, ...(activeTool === 'translation' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'translation'}
            data-testid="tool-translation"
          >
            <TranslationIcon /> <span className="tool-label">Translation</span>
          </button>
        )}
        {/* Rotation — complet only (3e cycle) */}
        {!isSimple && (
          <button
            ref={refIfActive('rotation')}
            onClick={() => onToolChange('rotation')}
            style={{ ...toolBtnBase, ...(activeTool === 'rotation' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'rotation'}
            data-testid="tool-rotation"
          >
            <RotationIcon /> <span className="tool-label">Rotation</span>
          </button>
        )}
        {/* Homothety — complet only (3e cycle) */}
        {!isSimple && (
          <button
            ref={refIfActive('homothety')}
            onClick={() => onToolChange('homothety')}
            style={{ ...toolBtnBase, ...(activeTool === 'homothety' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'homothety'}
            data-testid="tool-homothety"
          >
            <HomothetyIcon /> <span className="tool-label">Agrandir</span>
          </button>
        )}

        {/* ─ sep ─ */}
        {(!needsOverflow || moreOpen) && (
          <div
            style={{
              width: 2,
              height: 28,
              background: UI_BORDER,
              margin: '0 6px',
              flexShrink: 0,
              borderRadius: 1,
              opacity: 0.6,
            }}
          />
        )}

        {/* ═══ GROUP: Vérifier ═══ */}
        {/* Compare — behind "Plus d'outils" in simplifie */}
        {(!needsOverflow || moreOpen) && (
          <button
            ref={refIfActive('compare')}
            onClick={() => onToolChange('compare')}
            style={{ ...toolBtnBase, ...(activeTool === 'compare' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'compare'}
            data-testid="tool-compare"
          >
            <CompareIcon /> <span className="tool-label">{TOOL_COMPARE}</span>
          </button>
        )}
        {/* Symmetry — behind "Plus d'outils" in simplifie */}
        {(!needsOverflow || moreOpen) && (
          <button
            ref={refIfActive('symmetry')}
            onClick={() => onToolChange('symmetry')}
            style={{ ...toolBtnBase, ...(activeTool === 'symmetry' ? activeStyle : {}) }}
            aria-pressed={activeTool === 'symmetry'}
            data-testid="tool-symmetry"
          >
            <SymmetryIcon /> <span className="tool-label">Symétrie</span>
          </button>
        )}

        {/* "Plus d'outils" toggle — simplifié always, complet on narrow screens */}
        {needsOverflow &&
          (() => {
            const OVERFLOW_TOOLS: readonly ToolType[] = [
              'perpendicular',
              'parallel',
              'reproduce',
              'frieze',
              'compare',
              'symmetry',
            ];
            const activeInOverflow = OVERFLOW_TOOLS.includes(activeTool) && !moreOpen;
            return (
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                style={{
                  ...toolBtnBase,
                  fontSize: 'inherit',
                  color: moreOpen || activeInOverflow ? UI_PRIMARY : UI_TEXT_PRIMARY,
                  fontWeight: activeInOverflow ? 700 : undefined,
                }}
                aria-expanded={moreOpen}
                data-testid="more-tools"
              >
                {activeInOverflow ? '▸' : '⋯'}
              </button>
            );
          })()}

        {/* Spacer — pushes utility tools to the right */}
        <div style={{ flexGrow: 1 }} />

        {/* ═══ GROUP: Utilitaires (positions stables à droite) ═══ */}
        <div
          style={{
            width: 2,
            height: 28,
            background: UI_BORDER,
            margin: '0 6px',
            flexShrink: 0,
            borderRadius: 1,
            opacity: 0.6,
          }}
        />
        <button
          ref={refIfActive('select')}
          onClick={() => onToolChange('select')}
          style={{ ...toolBtnBase, ...(activeTool === 'select' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'select'}
          data-testid="tool-select"
        >
          <SelectIcon /> <span className="tool-label">{TOOL_SELECT}</span>
        </button>
        <button
          ref={refIfActive('move')}
          onClick={() => onToolChange('move')}
          style={{ ...toolBtnBase, ...(activeTool === 'move' ? activeStyle : {}) }}
          aria-pressed={activeTool === 'move'}
          data-testid="tool-move"
        >
          <MoveIcon /> <span className="tool-label">{TOOL_MOVE}</span>
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
        {/* ─ sep ─ */}
        <div
          style={{
            width: 2,
            height: 28,
            background: UI_BORDER,
            margin: '0 6px',
            flexShrink: 0,
            borderRadius: 1,
            opacity: 0.6,
          }}
        />
        {!demoMode && onModeChange && <ModeSelector mode={displayMode} onChange={onModeChange} />}
      </div>
    </div>
  );
});
