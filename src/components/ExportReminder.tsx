/**
 * Export reminder banner — spec §17.1.
 * Shown every 7 days if there are constructions and no recent .tracevite export.
 */

import { memo, useEffect, useState } from 'react';
import { UI_PRIMARY } from '@/config/theme';

const STORAGE_KEY = 'tracevite_last_export_ts';
const REMINDER_DISMISSED_KEY = 'tracevite_export_reminder_dismissed';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface ExportReminderProps {
  readonly hasConstructions: boolean;
  readonly onExport: () => void;
}

export const ExportReminder = memo(function ExportReminder({
  hasConstructions,
  onExport,
}: ExportReminderProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasConstructions) return;
    const dismissed = localStorage.getItem(REMINDER_DISMISSED_KEY) === 'true';
    if (dismissed) return;

    const lastExport = localStorage.getItem(STORAGE_KEY);
    const lastTs = lastExport ? parseInt(lastExport, 10) : 0;
    if (Date.now() - lastTs > SEVEN_DAYS_MS) {
      setVisible(true);
    }
  }, [hasConstructions]);

  if (!visible) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: '#FFF8E6',
        borderBottom: '1px solid #E6D9A8',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
      }}
      data-testid="export-reminder"
    >
      <span style={{ flex: 1 }}>Pense à sauvegarder ta figure dans ton dossier!</span>
      <button
        onClick={() => {
          onExport();
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
          setVisible(false);
        }}
        style={{
          padding: '4px 10px',
          background: UI_PRIMARY,
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Enregistrer un fichier
      </button>
      <button
        onClick={() => {
          localStorage.setItem(REMINDER_DISMISSED_KEY, 'true');
          setVisible(false);
        }}
        style={{
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: '#666',
        }}
      >
        Ne plus rappeler
      </button>
    </div>
  );
});

/** Call this when a .tracevite file is exported to reset the reminder timer. */
export function markExportDone() {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}
