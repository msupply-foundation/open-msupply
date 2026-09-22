import { describe, expect, it } from 'vitest';
import {
  PO_STATUS_KEY,
  PO_STATUSES,
  isRowRestricted,
  poLineStatusLabelKey,
  poStatusLabelKey,
  type PurchaseOrderStatus,
} from './purchaseOrderStatus';

// The purchase-order status mapping (spec/purchase-orders ui-surface § status
// labels): two of the five stored names mislead, so nothing may render the
// enum. Shared by the list's chip, its status filter, the CSV export and the
// supplier detail's Purchase Orders tab (spec/names AC-N26), so the mapping is
// pinned here once. The t() wrapper (poStatusLabel) is a thin call over the key
// mapping.

describe('purchase-order status labels', () => {
  it('maps every status to its displayed label key', () => {
    expect(poStatusLabelKey('NEW')).toBe('label.new');
    expect(poStatusLabelKey('REQUEST_APPROVAL')).toBe(
      'label.ready-for-approval'
    );
    // The stored name is "confirmed" and the key is `ready-to-send`; the text
    // it resolves to is "Ready for sending". None of the three match, which is
    // exactly why nothing may infer this.
    expect(poStatusLabelKey('CONFIRMED')).toBe('label.ready-to-send');
    expect(poStatusLabelKey('SENT')).toBe('label.sent');
    expect(poStatusLabelKey('FINALISED')).toBe('label.finalised');
  });

  it('covers exactly the five PurchaseOrderNodeStatus values', () => {
    expect(Object.keys(PO_STATUS_KEY).sort()).toEqual(
      ['CONFIRMED', 'FINALISED', 'NEW', 'REQUEST_APPROVAL', 'SENT'].sort()
    );
  });

  it('falls back to the New label for an unmapped status', () => {
    // A value outside the known enum (e.g. a status added server-side before
    // the client knows it) resolves to the New label rather than throwing.
    expect(poStatusLabelKey('SOMETHING_NEW' as PurchaseOrderStatus)).toBe(
      'label.new'
    );
  });

  it('offers the five states in lifecycle order, not enum order', () => {
    // The status filter reads this, so it must read as the ladder does
    // (rules § the status lifecycle).
    expect(PO_STATUSES).toEqual([
      'NEW',
      'REQUEST_APPROVAL',
      'CONFIRMED',
      'SENT',
      'FINALISED',
    ]);
  });
});

describe('OMS-FUN-PO-15.10 — restricted rows', () => {
  it('marks a Sent or Finalised order as restricted, and no other', () => {
    expect(PO_STATUSES.filter(isRowRestricted)).toEqual(['SENT', 'FINALISED']);
  });
});

// A LINE's three states are a different vocabulary from the order's five
// (rules § line status), and an order's own screen renders them in its Status
// column — so they are subject to the same never-render-the-enum rule.
describe('line status labels', () => {
  it('labels each of the three line states', () => {
    expect(poLineStatusLabelKey('NEW')).toBe('label.new');
    expect(poLineStatusLabelKey('SENT')).toBe('label.sent');
    expect(poLineStatusLabelKey('CLOSED')).toBe('label.closed');
  });

  it('never renders the wire value, even for one it does not know', () => {
    expect(poLineStatusLabelKey('SOMETHING_NEW')).toBe('label.new');
  });
});
