import { describe, expect, it } from 'vitest';
import {
  PO_STATUS_KEY,
  poStatusLabelKey,
  type PurchaseOrderStatus,
} from './purchaseOrderStatus';

// Purchase-order status label mapping for the supplier detail Purchase Orders
// tab (spec/names ui-surface.md S4 — status column is translated;
// acceptance.md AC-N26). The pure key mapping is tested here; the t() label
// wrapper (poStatusLabel) is a thin call over it.

describe('AC-N26 Purchase Orders tab — status label mapping', () => {
  it('maps every status to the current app’s label key', () => {
    expect(poStatusLabelKey('NEW')).toBe('label.new');
    expect(poStatusLabelKey('REQUEST_APPROVAL')).toBe(
      'label.ready-for-approval'
    );
    expect(poStatusLabelKey('CONFIRMED')).toBe('label.ready-to-send');
    expect(poStatusLabelKey('SENT')).toBe('label.sent');
    expect(poStatusLabelKey('FINALISED')).toBe('label.finalised');
  });

  it('covers exactly the five PurchaseOrderNodeStatus values', () => {
    expect(Object.keys(PO_STATUS_KEY).sort()).toEqual(
      ['CONFIRMED', 'FINALISED', 'NEW', 'REQUEST_APPROVAL', 'SENT'].sort()
    );
  });

  it('falls back to the NEW label for an unmapped status (getStatusTranslator ?? New)', () => {
    // A value outside the known enum (e.g. a status added server-side before
    // the client knows it) resolves to the NEW label rather than throwing.
    expect(poStatusLabelKey('SOMETHING_NEW' as PurchaseOrderStatus)).toBe(
      'label.new'
    );
  });
});
