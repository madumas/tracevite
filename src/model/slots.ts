/**
 * Slot management — pure functions for construction slots.
 * Max 50 slots. Auto-naming "Construction N".
 */

import { generateId } from './id';

export interface SlotMetadata {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly thumbnail: string; // base64 data URI or empty
}

export interface SlotRegistry {
  readonly slots: readonly SlotMetadata[];
  readonly activeSlotId: string | null;
  readonly nextNumber: number;
}

export const MAX_SLOTS = 50;
export const WARN_SLOTS = 45;
export const EXPORT_REMINDER_DAYS = 7;

/** Create an empty slot registry. */
export function createEmptyRegistry(): SlotRegistry {
  return { slots: [], activeSlotId: null, nextNumber: 1 };
}

/** Create a new slot with auto-generated name. */
export function createSlot(
  registry: SlotRegistry,
  name?: string,
): { registry: SlotRegistry; slotId: string } | null {
  if (registry.slots.length >= MAX_SLOTS) return null;

  const id = generateId();
  const slotName = name ?? `Construction ${registry.nextNumber}`;
  const now = Date.now();
  const slot: SlotMetadata = {
    id,
    name: slotName,
    createdAt: now,
    updatedAt: now,
    thumbnail: '',
  };

  return {
    registry: {
      slots: [...registry.slots, slot],
      activeSlotId: id,
      nextNumber: name ? registry.nextNumber : registry.nextNumber + 1,
    },
    slotId: id,
  };
}

/** Rename a slot. */
export function renameSlot(registry: SlotRegistry, slotId: string, name: string): SlotRegistry {
  return {
    ...registry,
    slots: registry.slots.map((s) => (s.id === slotId ? { ...s, name, updatedAt: Date.now() } : s)),
  };
}

/** Delete a slot. If it was active, activeSlotId becomes null. */
export function deleteSlot(registry: SlotRegistry, slotId: string): SlotRegistry {
  return {
    ...registry,
    slots: registry.slots.filter((s) => s.id !== slotId),
    activeSlotId: registry.activeSlotId === slotId ? null : registry.activeSlotId,
  };
}

/** Set the active slot. */
export function setActiveSlot(registry: SlotRegistry, slotId: string): SlotRegistry {
  return { ...registry, activeSlotId: slotId };
}

/** Update a slot's metadata (thumbnail, updatedAt). */
export function updateSlotMetadata(
  registry: SlotRegistry,
  slotId: string,
  update: Partial<Pick<SlotMetadata, 'thumbnail' | 'updatedAt'>>,
): SlotRegistry {
  return {
    ...registry,
    slots: registry.slots.map((s) =>
      s.id === slotId ? { ...s, ...update, updatedAt: update.updatedAt ?? Date.now() } : s,
    ),
  };
}

/** Check if a new slot can be created. */
export function canCreateSlot(registry: SlotRegistry): boolean {
  return registry.slots.length < MAX_SLOTS;
}

/** Check if we should warn about slot limit (>= 45). */
export function shouldWarnSlotLimit(registry: SlotRegistry): boolean {
  return registry.slots.length >= WARN_SLOTS;
}

/** Check if we should remind about export (7+ days since last export). */
export function shouldRemindExport(lastExportTimestamp: number | null): boolean {
  if (!lastExportTimestamp) return true;
  const daysSince = (Date.now() - lastExportTimestamp) / (1000 * 60 * 60 * 24);
  return daysSince >= EXPORT_REMINDER_DAYS;
}
