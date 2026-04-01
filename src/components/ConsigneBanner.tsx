import { useState } from 'react';
import { CONSIGNE_HEIGHT, UI_TEXT_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';
import { ConsignePopover } from './ConsignePopover';

interface ConsigneBannerProps {
  readonly consigne: string;
  readonly onDismiss: () => void;
}

/**
 * Consigne banner — pale blue, overlays top ~40px of canvas.
 * "Consigne : " bold prefix, max 2 lines with ellipsis, click for full text.
 * Close button hides for session (does NOT delete consigne).
 * Security: uses textContent pattern only (never innerHTML).
 */
export function ConsigneBanner({ consigne, onDismiss }: ConsigneBannerProps) {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: CONSIGNE_HEIGHT,
          background: '#E6F1FB',
          borderBottom: '1px solid #C5D8EC',
          borderLeft: '3px solid #185FA5',
          display: 'flex',
          alignItems: 'center',
          padding: '4px 12px',
          zIndex: 15,
          cursor: 'pointer',
        }}
        onClick={() => setShowPopover(true)}
        data-testid="consigne-banner"
      >
        <div
          style={{
            flex: 1,
            fontSize: 14,
            color: UI_TEXT_PRIMARY,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '18px',
          }}
        >
          <strong>Consigne : </strong>
          {consigne}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          style={{
            width: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: '#6B7280',
            flexShrink: 0,
          }}
          aria-label="Fermer la consigne"
          data-testid="consigne-close"
        >
          ×
        </button>
      </div>

      {showPopover && <ConsignePopover consigne={consigne} onClose={() => setShowPopover(false)} />}
    </>
  );
}
