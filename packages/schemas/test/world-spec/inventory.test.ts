import { InventoryItemSchema, InventoryStateSchema } from '@arcagentic/schemas';

describe('Inventory schemas', () => {
  it('parses a valid inventory item with required id and name', () => {
    const item = InventoryItemSchema.parse({
      id: 'item-001',
      name: 'Lantern',
    });

    expect(item).toEqual({
      id: 'item-001',
      name: 'Lantern',
    });
  });

  it('enforces the description max length of 320 characters', () => {
    expect(
      InventoryItemSchema.safeParse({
        id: 'item-001',
        name: 'Lantern',
        description: 'a'.repeat(320),
      }).success
    ).toBe(true);

    expect(
      InventoryItemSchema.safeParse({
        id: 'item-001',
        name: 'Lantern',
        description: 'a'.repeat(321),
      }).success
    ).toBe(false);
  });

  it('requires quantity to be a non-negative integer', () => {
    expect(
      InventoryItemSchema.safeParse({
        id: 'item-001',
        name: 'Lantern',
        quantity: 0,
      }).success
    ).toBe(true);

    expect(
      InventoryItemSchema.safeParse({
        id: 'item-001',
        name: 'Lantern',
        quantity: -1,
      }).success
    ).toBe(false);

    expect(
      InventoryItemSchema.safeParse({
        id: 'item-001',
        name: 'Lantern',
        quantity: 1.5,
      }).success
    ).toBe(false);
  });

  it('enforces the tags array max length of 32', () => {
    expect(
      InventoryItemSchema.safeParse({
        id: 'item-001',
        name: 'Lantern',
        tags: Array.from({ length: 32 }, (_, index) => `tag-${index}`),
      }).success
    ).toBe(true);

    expect(
      InventoryItemSchema.safeParse({
        id: 'item-001',
        name: 'Lantern',
        tags: Array.from({ length: 33 }, (_, index) => `tag-${index}`),
      }).success
    ).toBe(false);
  });

  it('parses inventory state with items and capacity', () => {
    const state = InventoryStateSchema.parse({
      items: [
        {
          id: 'item-001',
          name: 'Lantern',
          quantity: 1,
        },
      ],
      capacity: 10,
    });

    expect(state.capacity).toBe(10);
    expect(state.items).toHaveLength(1);
  });

  it('accepts an empty items array', () => {
    expect(
      InventoryStateSchema.safeParse({
        items: [],
      }).success
    ).toBe(true);
  });
});
