/**
 * Floating panel for frieze/tiling count stepper.
 * Positioned over the canvas, above the status bar.
 * All buttons are 44×44px minimum (TDC accessibility).
 */

import { UI_SURFACE, UI_BORDER, UI_PRIMARY, UI_TEXT_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX } from '@/config/accessibility';

interface FriezePanelProps {
  readonly count: number;
  readonly segmentCount: number;
  readonly maxCount: number;
  readonly onIncrement: () => void;
  readonly onDecrement: () => void;
  readonly onValidate: () => void;
  /** Show the "Dallage" button to add a second vector. */
  readonly showTilingButton?: boolean;
  readonly onStartTiling?: () => void;
  /** Second axis count (tiling mode). */
  readonly count2?: number;
  readonly maxCount2?: number;
  readonly onIncrement2?: () => void;
  readonly onDecrement2?: () => void;
}

const btnStyle: React.CSSProperties = {
  minWidth: MIN_BUTTON_SIZE_PX,
  height: MIN_BUTTON_SIZE_PX,
  border: `1px solid ${UI_BORDER}`,
  borderRadius: 6,
  background: UI_SURFACE,
  color: UI_TEXT_PRIMARY,
  cursor: 'pointer',
  fontSize: 20,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function FriezePanel({
  count,
  segmentCount,
  maxCount,
  onIncrement,
  onDecrement,
  onValidate,
  showTilingButton,
  onStartTiling,
  count2,
  maxCount2: maxCount2Prop,
  onIncrement2,
  onDecrement2,
}: FriezePanelProps) {
  const maxCount2 = maxCount2Prop ?? maxCount;
  const isTiling = count2 != null;
  const totalCopies = isTiling ? count * count2 - 1 : count - 1;
  const totalSegments = totalCopies * segmentCount;

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        background: UI_SURFACE,
        border: `1px solid ${UI_BORDER}`,
        borderRadius: 8,
        padding: '6px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        fontSize: 14,
        whiteSpace: 'nowrap',
      }}
      data-testid="frieze-panel"
    >
      {/* Axis 1 stepper */}
      <button
        onClick={onDecrement}
        disabled={count <= 2}
        style={{ ...btnStyle, opacity: count <= 2 ? 0.4 : 1 }}
        aria-label="Moins de copies"
        data-testid="frieze-decrement"
      >
        −
      </button>
      <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{count}</span>
      <button
        onClick={onIncrement}
        disabled={count >= maxCount}
        style={{ ...btnStyle, opacity: count >= maxCount ? 0.4 : 1 }}
        aria-label="Plus de copies"
        data-testid="frieze-increment"
      >
        +
      </button>

      {/* Axis 2 stepper (tiling mode) */}
      {isTiling && onIncrement2 && onDecrement2 && (
        <>
          <span style={{ color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: 600 }}>×</span>
          <button
            onClick={onDecrement2}
            disabled={count2 <= 2}
            style={{ ...btnStyle, opacity: count2 <= 2 ? 0.4 : 1 }}
            aria-label="Moins de rangées"
            data-testid="frieze-decrement2"
          >
            −
          </button>
          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{count2}</span>
          <button
            onClick={onIncrement2}
            disabled={count2 >= maxCount2}
            style={{ ...btnStyle, opacity: count2 >= maxCount2 ? 0.4 : 1 }}
            aria-label="Plus de rangées"
            data-testid="frieze-increment2"
          >
            +
          </button>
        </>
      )}

      {/* Info */}
      <span style={{ color: UI_TEXT_PRIMARY, opacity: 0.7, fontSize: 12 }}>
        {totalCopies} copie{totalCopies > 1 ? 's' : ''} ({totalSegments} segments)
      </span>

      {/* Tiling button */}
      {showTilingButton && onStartTiling && (
        <button
          onClick={onStartTiling}
          style={{
            ...btnStyle,
            minWidth: 'auto',
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 500,
          }}
          data-testid="frieze-tiling"
        >
          Dallage
        </button>
      )}

      {/* Validate button */}
      <button
        onClick={onValidate}
        style={{
          ...btnStyle,
          minWidth: 'auto',
          padding: '0 16px',
          background: UI_PRIMARY,
          color: '#FFFFFF',
          border: 'none',
          fontSize: 14,
          fontWeight: 600,
        }}
        data-testid="frieze-validate"
      >
        Valider
      </button>
    </div>
  );
}
