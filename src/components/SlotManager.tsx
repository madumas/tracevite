import { useState, useRef, useMemo } from 'react';
import type { SlotRegistry, SlotMetadata } from '@/model/slots';
import { canCreateSlot, shouldWarnSlotLimit, MAX_SLOTS } from '@/model/slots';
import { generateThumbnail } from '@/engine/thumbnail';
import {
  exportToTracevite,
  importFromTracevite,
  sanitizeFilename,
  downloadFile,
  ImportError,
  getImportErrorMessage,
} from '@/model/file-io';
import type { ConstructionState } from '@/model/types';
import {
  UI_PRIMARY,
  UI_DESTRUCTIVE,
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from '@/config/theme';

interface SlotManagerProps {
  readonly registry: SlotRegistry;
  readonly activeSlotId: string | null;
  readonly state: ConstructionState;
  readonly onSwitch: (slotId: string) => void;
  readonly onCreate: (name?: string) => void;
  readonly onDelete: (slotId: string) => void;
  readonly onRename: (slotId: string, name: string) => void;
  readonly onImport: (state: ConstructionState, name: string) => void;
  readonly onClose: () => void;
}

export function SlotManager({
  registry,
  activeSlotId,
  state,
  onSwitch,
  onCreate,
  onDelete,
  onRename,
  onImport,
  onClose,
}: SlotManagerProps) {
  // Live thumbnail for the active slot (always fresh)
  const activeThumbnail = useMemo(() => generateThumbnail(state), [state]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRename = (slot: SlotMetadata) => {
    if (editingId === slot.id) {
      if (editName.trim()) onRename(slot.id, editName.trim());
      setEditingId(null);
    } else {
      setEditingId(slot.id);
      setEditName(slot.name);
    }
  };

  const handleExport = (slot: SlotMetadata) => {
    const json = exportToTracevite(state);
    downloadFile(json, `${sanitizeFilename(slot.name)}.tracevite`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importFromTracevite(text);
      const name = file.name.replace(/\.tracevite$/, '') || 'Import';
      onImport(imported, name);
      setImportError(null);
    } catch (err) {
      if (err instanceof ImportError) {
        setImportError(getImportErrorMessage(err.code));
      } else {
        setImportError("Erreur lors de l'ouverture du fichier.");
      }
    }
    e.target.value = '';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: UI_SURFACE,
          borderRadius: 12,
          padding: '20px 24px',
          width: 420,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="slot-manager"
      >
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: UI_TEXT_PRIMARY }}>
          Mes constructions
        </h2>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => onCreate()}
            disabled={!canCreateSlot(registry)}
            style={{
              padding: '6px 12px',
              background: UI_PRIMARY,
              color: '#FFF',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
              opacity: canCreateSlot(registry) ? 1 : 0.5,
            }}
            data-testid="slot-new"
          >
            Nouvelle construction
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: `1px solid ${UI_BORDER}`,
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
              color: UI_TEXT_PRIMARY,
            }}
            data-testid="slot-import"
          >
            Ouvrir un fichier
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".tracevite"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
        </div>

        {shouldWarnSlotLimit(registry) && (
          <div
            style={{
              background: '#FFF8E1',
              padding: '6px 10px',
              borderRadius: 4,
              fontSize: 12,
              color: '#E65100',
              marginBottom: 8,
            }}
          >
            {registry.slots.length}/{MAX_SLOTS} constructions. Exporte ou supprime pour en créer de
            nouvelles.
          </div>
        )}

        {importError && (
          <div
            style={{
              background: '#FFEBEE',
              padding: '6px 10px',
              borderRadius: 4,
              fontSize: 12,
              color: UI_DESTRUCTIVE,
              marginBottom: 8,
            }}
          >
            {importError}
          </div>
        )}

        {/* Slot list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {registry.slots.map((slot) => (
            <div
              key={slot.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 6,
                border:
                  slot.id === activeSlotId ? `2px solid ${UI_PRIMARY}` : `1px solid ${UI_BORDER}`,
                background: slot.id === activeSlotId ? '#E8F0FA' : 'transparent',
              }}
              data-testid={`slot-${slot.id}`}
            >
              {/* Thumbnail — use live thumbnail for active slot */}
              {(() => {
                const thumb = slot.id === activeSlotId ? activeThumbnail : slot.thumbnail;
                return thumb ? (
                  <img
                    src={thumb}
                    width={60}
                    height={40}
                    alt=""
                    style={{
                      objectFit: 'contain',
                      borderRadius: 3,
                      border: `1px solid ${UI_BORDER}`,
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 40,
                      borderRadius: 3,
                      border: `1px solid ${UI_BORDER}`,
                      background: '#F0F0F0',
                      flexShrink: 0,
                    }}
                  />
                );
              })()}

              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === slot.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(slot);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => handleRename(slot)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '2px 4px',
                      border: `1px solid ${UI_PRIMARY}`,
                      borderRadius: 3,
                      fontSize: 13,
                    }}
                  />
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: UI_TEXT_PRIMARY,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {slot.name}
                      {slot.id === activeSlotId && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: UI_PRIMARY,
                            background: '#D4E4F7',
                            padding: '1px 6px',
                            borderRadius: 3,
                            flexShrink: 0,
                          }}
                        >
                          En cours
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY }}>
                      {new Date(slot.updatedAt).toLocaleDateString('fr-CA')}
                    </div>
                  </>
                )}
              </div>

              {/* Actions per slot */}
              {slot.id !== activeSlotId && (
                <button onClick={() => onSwitch(slot.id)} style={smallBtn}>
                  Ouvrir
                </button>
              )}
              <button onClick={() => handleRename(slot)} style={smallBtn}>
                {editingId === slot.id ? '✓' : 'Renommer'}
              </button>
              <button onClick={() => handleExport(slot)} style={smallBtn}>
                Exporter
              </button>
              {confirmDeleteId === slot.id ? (
                <button
                  onClick={() => {
                    onDelete(slot.id);
                    setConfirmDeleteId(null);
                  }}
                  style={{ ...smallBtn, background: UI_DESTRUCTIVE, color: '#FFF' }}
                >
                  Confirmer
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(slot.id)}
                  style={{ ...smallBtn, color: UI_DESTRUCTIVE }}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {registry.slots.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: UI_TEXT_SECONDARY,
                padding: 20,
                fontStyle: 'italic',
              }}
            >
              Aucune construction sauvegardée
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '8px',
            background: 'transparent',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            color: UI_TEXT_PRIMARY,
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: '3px 8px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 11,
  color: '#4A5568',
  whiteSpace: 'nowrap',
};
