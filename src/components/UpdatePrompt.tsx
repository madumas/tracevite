import { UI_PRIMARY, UI_BORDER } from '@/config/theme';

interface UpdatePromptProps {
  readonly onUpdate: () => void;
  readonly onDismiss: () => void;
}

/**
 * Non-blocking banner above action bar for PWA updates.
 */
export function UpdatePrompt({ onUpdate, onDismiss }: UpdatePromptProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '6px 12px',
        background: '#E3F2FD',
        borderTop: `1px solid ${UI_BORDER}`,
        fontSize: 13,
      }}
      data-testid="update-prompt"
    >
      <span>Une nouvelle version est disponible</span>
      <button
        onClick={onUpdate}
        style={{
          padding: '4px 12px',
          background: UI_PRIMARY,
          color: '#FFF',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Mettre à jour
      </button>
      <button
        onClick={onDismiss}
        style={{
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          color: '#6B7280',
        }}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
