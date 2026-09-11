import { describe, expect, it } from 'vitest';
import {
  requestedQuantityForItem,
  showsInternalOrderContext,
  type OrderLine,
} from './internalOrderContext';

const orderLines: OrderLine[] = [
  { item: { id: 'item-a' }, requestedQuantity: 100 },
  { item: { id: 'item-b' }, requestedQuantity: 40 },
];

describe('showsInternalOrderContext (OMS-REG-ISH-01.14)', () => {
  it('shows on an internal-order-linked shipment', () => {
    expect(showsInternalOrderContext(true, false)).toBe(true);
  });

  it('is absent on a shipment with no internal-order link', () => {
    expect(showsInternalOrderContext(false, false)).toBe(false);
  });

  it('is absent on a purchase-order-linked shipment — the order states its own requested quantities', () => {
    expect(showsInternalOrderContext(true, true)).toBe(false);
    expect(showsInternalOrderContext(false, true)).toBe(false);
  });
});

describe('requestedQuantityForItem', () => {
  // OMS-REG-ISH-01.12 — a line reports the units requested for its item.
  it("takes the line's own resolved order line where there is one", () => {
    expect(requestedQuantityForItem('item-a', 100, [])).toBe(100);
  });

  // The line's own value is the authority: the server resolves it without a
  // store filter, so it still answers for a requisition link that arrived by
  // sync from another store (contract wire trap) — a case the store-scoped
  // order lookup cannot see.
  it('prefers the line-resolved figure over the fetched order lines', () => {
    expect(
      requestedQuantityForItem('item-a', 100, [
        { item: { id: 'item-a' }, requestedQuantity: 999 },
      ])
    ).toBe(100);
  });

  // OMS-REG-ISH-01.13 — the match is on ITEM, so every batch of one item gets
  // the same figure; add mode has no line yet, so the order answers.
  it('falls back to the order lines when the item has no line here yet', () => {
    expect(requestedQuantityForItem('item-b', null, orderLines)).toBe(40);
  });

  it('gives every batch of one item the same figure', () => {
    const batches = [null, null, null];
    expect(
      batches.map(() => requestedQuantityForItem('item-a', null, orderLines))
    ).toEqual([100, 100, 100]);
  });

  // OMS-REG-ISH-01.13/.16 — an item with no line on the order reports none.
  it('reports none for an item that is not on the order', () => {
    expect(
      requestedQuantityForItem('item-not-ordered', null, orderLines)
    ).toBeUndefined();
  });

  it('reports none before an item is chosen', () => {
    expect(
      requestedQuantityForItem(undefined, null, orderLines)
    ).toBeUndefined();
  });

  // A genuine zero is a figure, not an absence — "they asked for none of this"
  // must not read as "this item is not on the order".
  it('treats a requested quantity of zero as a figure, not an absence', () => {
    expect(requestedQuantityForItem('item-a', 0, [])).toBe(0);
    expect(
      requestedQuantityForItem('item-z', null, [
        { item: { id: 'item-z' }, requestedQuantity: 0 },
      ])
    ).toBe(0);
  });
});
