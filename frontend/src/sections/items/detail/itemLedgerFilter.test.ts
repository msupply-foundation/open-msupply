import { describe, expect, it } from 'vitest';
import { buildWireFilter } from './itemLedgerFilter';

describe('itemLedgerFilter — Ledger tab chip state → wire filter', () => {
  const ITEM = 'item-1';

  it('always scopes to the item, and applies nothing else when no chip is set', () => {
    expect(buildWireFilter(ITEM, {})).toEqual({ itemId: { equalTo: ITEM } });
  });

  // The date-time chip is SEEDED present on the bar (its key exists with a null
  // value), so "present but empty" must contribute no filter — otherwise simply
  // arriving on the tab would narrow the ledger.
  it('an added-but-empty chip contributes no filter', () => {
    expect(
      buildWireFilter(ITEM, {
        datetime: null,
        invoiceType: null,
        invoiceStatus: null,
      })
    ).toEqual({ itemId: { equalTo: ITEM } });
    // A range object with neither bound chosen is equally empty.
    expect(
      buildWireFilter(ITEM, { datetime: { start: null, end: null } })
    ).toEqual({ itemId: { equalTo: ITEM } });
  });

  it('applies each datetime bound independently', () => {
    expect(
      buildWireFilter(ITEM, {
        datetime: { start: '2026-01-01T00:00:00Z', end: null },
      })
    ).toEqual({
      itemId: { equalTo: ITEM },
      datetime: { afterOrEqualTo: '2026-01-01T00:00:00Z' },
    });
    expect(
      buildWireFilter(ITEM, {
        datetime: { start: null, end: '2026-02-01T00:00:00Z' },
      })
    ).toEqual({
      itemId: { equalTo: ITEM },
      datetime: { beforeOrEqualTo: '2026-02-01T00:00:00Z' },
    });
    expect(
      buildWireFilter(ITEM, {
        datetime: {
          start: '2026-01-01T00:00:00Z',
          end: '2026-02-01T00:00:00Z',
        },
      })
    ).toEqual({
      itemId: { equalTo: ITEM },
      datetime: {
        afterOrEqualTo: '2026-01-01T00:00:00Z',
        beforeOrEqualTo: '2026-02-01T00:00:00Z',
      },
    });
  });

  it('applies the type and status chips as equality matches', () => {
    expect(
      buildWireFilter(ITEM, {
        invoiceType: 'CUSTOMER_RETURN',
        invoiceStatus: 'VERIFIED',
      })
    ).toEqual({
      itemId: { equalTo: ITEM },
      invoiceType: { equalTo: 'CUSTOMER_RETURN' },
      invoiceStatus: { equalTo: 'VERIFIED' },
    });
  });
});
