import { describe, expect, it } from 'vitest';
import {
  PO_LADDER,
  PO_STATUS_KEY,
  PO_STATUSES,
  isRowRestricted,
  poLineStatusLabelKey,
  poStatusLabelKey,
  type PurchaseOrderStatus,
} from './purchaseOrderStatus';

// The purchase-order status mapping (spec/purchase-orders ui-surface § status
// labels): two of the stored names mislead, so nothing may render the
// enum. Shared by the list's chip, its status filter, the CSV export and the
// supplier detail's Purchase Orders tab (spec/names OMS-REG-REPL-08.23), so the
// mapping is pinned here once. The t() wrapper (poStatusLabel) is a thin call
// over the key mapping.

describe('purchase-order status labels', () => {
  it('maps every status to its displayed label key', () => {
    expect(poStatusLabelKey('NEW')).toBe('label.new');
    expect(poStatusLabelKey('REQUEST_APPROVAL')).toBe(
      'label.ready-for-approval'
    );
    // The stored name is "confirmed" but the state reads "Approved"
    // (OMS-FUN-PO-04.39) — which is exactly why nothing may infer this.
    expect(poStatusLabelKey('CONFIRMED')).toBe('label.approved');
    expect(poStatusLabelKey('SENT')).toBe('label.sent');
    expect(poStatusLabelKey('FINALISED')).toBe('label.finalised');
    expect(poStatusLabelKey('CANCELLED')).toBe('label.cancelled');
  });

  it('covers exactly the six PurchaseOrderNodeStatus values', () => {
    expect(Object.keys(PO_STATUS_KEY).sort()).toEqual(
      [
        'CANCELLED',
        'CONFIRMED',
        'FINALISED',
        'NEW',
        'REQUEST_APPROVAL',
        'SENT',
      ].sort()
    );
  });

  it('falls back to the New label for an unmapped status', () => {
    // A value outside the known enum (e.g. a status added server-side before
    // the client knows it) resolves to the New label rather than throwing.
    expect(poStatusLabelKey('SOMETHING_NEW' as PurchaseOrderStatus)).toBe(
      'label.new'
    );
  });

  it('walks the five rungs in lifecycle order, not enum order', () => {
    // The footer's ladder reads this, so it must read as the lifecycle does
    // (rules § the status lifecycle). Cancelled is a branch, not a rung.
    expect(PO_LADDER).toEqual([
      'NEW',
      'REQUEST_APPROVAL',
      'CONFIRMED',
      'SENT',
      'FINALISED',
    ]);
  });

  it('offers every status to the filter, the terminal branch last', () => {
    // The status filter reads this (OMS-FUN-PO-15.16): a cancelled order is a
    // real list state, so it is filterable like any other.
    expect(PO_STATUSES).toEqual([...PO_LADDER, 'CANCELLED']);
  });
});

describe('OMS-FUN-PO-15.10, .16 — restricted rows', () => {
  it('marks a Sent, Finalised or Cancelled order as restricted, and no other', () => {
    expect(PO_STATUSES.filter(isRowRestricted)).toEqual([
      'SENT',
      'FINALISED',
      'CANCELLED',
    ]);
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
