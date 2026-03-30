import { memo } from 'react';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

interface NavigationControlsProps {
  readonly onPanUp: () => void;
  readonly onPanDown: () => void;
  readonly onPanLeft: () => void;
  readonly onPanRight: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
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
  opacity: 0.5,
  zIndex: 10,
};

export const NavigationControls = memo(function NavigationControls({
  onPanUp,
  onPanDown,
  onPanLeft,
  onPanRight,
  onZoomIn,
  onZoomOut,
}: NavigationControlsProps) {
  return (
    <>
      {/* Pan buttons */}
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
      </div>
    </>
  );
});
