/**
 * Fatigue reminder — spec §19 v2.
 * Non-blocking banner at the bottom of the screen after continuous use.
 */

import { UI_TEXT_PRIMARY, UI_BORDER } from '@/config/theme';

interface FatigueReminderProps {
  readonly onDismiss: () => void;
}

export function FatigueReminder({ onDismiss }: FatigueReminderProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '10px 16px',
        background: '#FFF8E1',
        borderTop: `1px solid ${UI_BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        zIndex: 50,
        fontSize: 13,
        color: UI_TEXT_PRIMARY,
      }}
    >
      <span>Tu travailles depuis un moment. Prends une petite pause!</span>
      <button
        onClick={onDismiss}
        style={{
          padding: '4px 16px',
          minHeight: 44,
          minWidth: 44,
          background: '#E65100',
          color: '#FFF',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        OK
      </button>
    </div>
  );
}
