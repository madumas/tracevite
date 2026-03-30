import {
  createEmptyRegistry,
  createSlot,
  renameSlot,
  deleteSlot,
  setActiveSlot,
  canCreateSlot,
  shouldWarnSlotLimit,
  shouldRemindExport,
  MAX_SLOTS,
} from './slots';

describe('slots', () => {
  it('creates empty registry', () => {
    const reg = createEmptyRegistry();
    expect(reg.slots).toHaveLength(0);
    expect(reg.activeSlotId).toBeNull();
    expect(reg.nextNumber).toBe(1);
  });

  it('creates a slot with auto name', () => {
    const reg = createEmptyRegistry();
    const result = createSlot(reg);
    expect(result).not.toBeNull();
    expect(result!.registry.slots).toHaveLength(1);
    expect(result!.registry.slots[0]!.name).toBe('Construction 1');
    expect(result!.registry.activeSlotId).toBe(result!.slotId);
    expect(result!.registry.nextNumber).toBe(2);
  });

  it('creates slot with custom name', () => {
    const reg = createEmptyRegistry();
    const result = createSlot(reg, 'Mon exercice');
    expect(result!.registry.slots[0]!.name).toBe('Mon exercice');
    expect(result!.registry.nextNumber).toBe(1); // Not incremented for custom names
  });

  it('refuses creation at max slots', () => {
    let reg = createEmptyRegistry();
    for (let i = 0; i < MAX_SLOTS; i++) {
      reg = createSlot(reg)!.registry;
    }
    expect(createSlot(reg)).toBeNull();
  });

  it('renames a slot', () => {
    const reg = createSlot(createEmptyRegistry())!.registry;
    const id = reg.slots[0]!.id;
    const renamed = renameSlot(reg, id, 'Nouveau nom');
    expect(renamed.slots[0]!.name).toBe('Nouveau nom');
  });

  it('deletes a slot', () => {
    const reg = createSlot(createEmptyRegistry())!.registry;
    const id = reg.slots[0]!.id;
    const deleted = deleteSlot(reg, id);
    expect(deleted.slots).toHaveLength(0);
    expect(deleted.activeSlotId).toBeNull();
  });

  it('sets active slot', () => {
    let reg = createSlot(createEmptyRegistry())!.registry;
    const id1 = reg.slots[0]!.id;
    reg = createSlot(reg)!.registry;
    const id2 = reg.slots[1]!.id;
    expect(reg.activeSlotId).toBe(id2);
    reg = setActiveSlot(reg, id1);
    expect(reg.activeSlotId).toBe(id1);
  });

  it('canCreateSlot checks limit', () => {
    const reg = createEmptyRegistry();
    expect(canCreateSlot(reg)).toBe(true);
  });

  it('shouldWarnSlotLimit at 45', () => {
    let reg = createEmptyRegistry();
    for (let i = 0; i < 45; i++) {
      reg = createSlot(reg)!.registry;
    }
    expect(shouldWarnSlotLimit(reg)).toBe(true);
  });

  it('shouldRemindExport after 7 days', () => {
    expect(shouldRemindExport(null)).toBe(true);
    expect(shouldRemindExport(Date.now())).toBe(false);
    expect(shouldRemindExport(Date.now() - 8 * 24 * 60 * 60 * 1000)).toBe(true);
  });
});
