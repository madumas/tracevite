import { memo } from 'react';
import { SAVE_SAVED, SAVE_SAVING } from '@/config/messages';

interface SaveIndicatorProps {
  readonly saving: boolean;
  readonly compact?: boolean;
}

/**
 * Persistent save status indicator (Google Docs pattern).
 * Always visible: checkmark when saved, spinner when saving.
 */
export const SaveIndicator = memo(function SaveIndicator({
  saving,
  compact = false,
}: SaveIndicatorProps) {
  return (
    <span
      style={{
        fontSize: 12,
        color: '#9CA3AF',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
      data-testid="save-indicator"
      aria-label={saving ? SAVE_SAVING : SAVE_SAVED}
    >
      {saving ? '⟳' : '✓'}
      {!compact && <span>{saving ? SAVE_SAVING : SAVE_SAVED}</span>}
    </span>
  );
});
