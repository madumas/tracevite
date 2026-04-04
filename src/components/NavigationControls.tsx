import { memo } from 'react';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

interface NavigationControlsProps {
  readonly onPanUp: () => void;
  readonly onPanDown: () => void;
  readonly onPanLeft: () => void;
  readonly onPanRight: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  /** Current zoom level (1.0 = 100%). */
  readonly zoomLevel?: number;
  /** Reset zoom to 100%. */
  readonly onZoomReset?: () => void;
  /** When true, hide pan arrows (pinch-to-zoom replaces them on touch). */
  readonly hidePanButtons?: boolean;
}

const navBtnStyle: React.CSSProperties = {
  width: MIN_BUTTON_SIZE_PX,
  height: MIN_BUTTON_SIZE_PX,
  position: 'absolute',
  background: 'rgba(255,255,255,0.7)',
  border: '1px solid #D1D8E0',
  borderRadius: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  color: '#4A5568',
  opacity: 0.7,
  zIndex: 30,
};

export const NavigationControls = memo(function NavigationControls({
  onPanUp,
  onPanDown,
  onPanLeft,
  onPanRight,
  onZoomIn,
  onZoomOut,
  zoomLevel = 1.0,
  onZoomReset,
  hidePanButtons = false,
}: NavigationControlsProps) {
  const zoomPct = Math.round(zoomLevel * 100);
  return (
    <>
      {/* Pan buttons — hidden on mobile (two-finger pan replaces them) */}
      {!hidePanButtons && (
        <>
          <button
            onClick={onPanUp}
            style={{ ...navBtnStyle, top: 8, left: '50%', transform: 'translateX(-50%)' }}
            aria-label="Déplacer vers le haut"
            data-testid="pan-up"
          >
            ▲
          </button>
          <button
            onClick={onPanDown}
            style={{ ...navBtnStyle, bottom: 8, left: '50%', transform: 'translateX(-50%)' }}
            aria-label="Déplacer vers le bas"
            data-testid="pan-down"
          >
            ▼
          </button>
          <button
            onClick={onPanLeft}
            style={{ ...navBtnStyle, left: 8, top: '50%', transform: 'translateY(-50%)' }}
            aria-label="Déplacer vers la gauche"
            data-testid="pan-left"
          >
            ◀
          </button>
          <button
            onClick={onPanRight}
            style={{ ...navBtnStyle, right: 8, top: '50%', transform: 'translateY(-50%)' }}
            aria-label="Déplacer vers la droite"
            data-testid="pan-right"
          >
            ▶
          </button>
        </>
      )}

      {/* Zoom buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          zIndex: 10,
        }}
      >
        <button
          onClick={onZoomIn}
          style={{ ...navBtnStyle, position: 'relative' }}
          aria-label="Zoom avant"
          data-testid="zoom-in"
        >
          +
        </button>
        <button
          onClick={onZoomOut}
          style={{ ...navBtnStyle, position: 'relative' }}
          aria-label="Zoom arrière"
          data-testid="zoom-out"
        >
          −
        </button>
        {zoomPct !== 100 && onZoomReset && (
          <button
            onClick={onZoomReset}
            style={{
              ...navBtnStyle,
              position: 'relative',
              fontSize: 11,
              minWidth: MIN_BUTTON_SIZE_PX,
              padding: '0 2px',
              whiteSpace: 'nowrap',
            }}
            aria-label={`Zoom ${zoomPct}%, cliquer pour réinitialiser`}
            data-testid="zoom-level"
          >
            {zoomPct}%
          </button>
        )}
      </div>
    </>
  );
});
