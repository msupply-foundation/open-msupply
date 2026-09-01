import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ItemsListFilter } from '@/sections/items/list/itemFilter';
import type { ItemsDeepLinkFilter } from './deepLinks';
import {
  DAYS_TILL_EXPIRED,
  expiredStockPath,
  expiringBetweenThresholdsStockPath,
  expiringNextThreeMonthsStockPath,
  expiringSoonStockPath,
  inboundShipmentListPath,
  internalOrderListPath,
  lowStockItemsPath,
  outboundShipmentListPath,
  outOfStockItemsPath,
  prescriptionListPath,
  stockListPath,
  stocktakeListPath,
} from './deepLinks';

/*
 * The SDK's typed deep-link builders (spec/plugins/sdk-contract.md § SDK
 * surface — Navigation), promoted from the dashboard's stat links (#304).
 *
 * Two contracts under test. The VOCABULARY: every builder returns a
 * store-relative path — no store, no mount, no leading slash — because that
 * is what storeHref/navigateTo take (a builder that resolved either would
 * apply it twice). And the CORRESPONDENCE: each filtered path restates the
 * matching count's definition (spec/dashboard/rules.md § navigation
 * correspondence), asserted by decoding the `?query=` param exactly as
 * statLinks.test.ts pins the dashboard's own links — the same windows, minus
 * the store prefix, which is the whole promotion.
 */

// Decode the `?query=` JSON a path carries for the target list.
const filterOf = (path: string): Record<string, unknown> => {
  expect(path.startsWith('/')).toBe(false); // store-relative, always
  const query = new URL(path, 'http://x').searchParams.get('query');
  expect(query).not.toBeNull();
  return (JSON.parse(query!) as { filter: Record<string, unknown> }).filter;
};

// A fixed Wednesday, local time — the same instant statLinks.test.ts pins,
// so the two suites visibly assert one set of windows.
const wednesday = new Date(2026, 6, 22); // 2026-07-22

describe('task-list targets', () => {
  // The registry's own spellings (src/nav/navConfig.ts), one builder each, so
  // a plugin tile never hand-encodes a host route (AC-PLUG-P3/P4;
  // plugins/cook_islands/ui-surface.md § S2).
  it('names each core list as the navigation registry spells it', () => {
    expect(inboundShipmentListPath()).toBe('replenishment/inbound-shipment');
    expect(outboundShipmentListPath()).toBe('distribution/outbound-shipment');
    expect(internalOrderListPath()).toBe('replenishment/internal-order');
    expect(prescriptionListPath()).toBe('dispensary/prescription');
    expect(stocktakeListPath()).toBe('inventory/stocktakes');
  });
});

describe('stock paths', () => {
  it('the full stock list is the bare registry path', () => {
    expect(stockListPath()).toBe('inventory/stock');
  });

  // OMS-REG-DB-01.41 — expired: expiry on or before today.
  it('expired filters expiry ≤ today', () => {
    expect(filterOf(expiredStockPath(wednesday))).toEqual({
      expiryDate: { beforeOrEqualTo: '2026-07-22' },
    });
  });

  // OMS-REG-DB-01.42, D71 — expiring soon: exactly the count's window,
  // (today, today + 30d] — today's expiries are the expired set's.
  it('expiring soon spans tomorrow … today + 30 days', () => {
    expect(DAYS_TILL_EXPIRED).toBe(30);
    expect(filterOf(expiringSoonStockPath(wednesday))).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-07-23', // tomorrow — today itself is "expired"
        beforeOrEqualTo: '2026-08-21', // +30d
      },
    });
  });

  // OMS-REG-DB-01.44 — the fixed 30–89-day slice: the 90th day is excluded.
  it('one-to-three-months spans day 30 … day 89 (90 excluded)', () => {
    expect(filterOf(expiringNextThreeMonthsStockPath(wednesday))).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-08-21', // +30d
        beforeOrEqualTo: '2026-10-19', // +89d — NOT +90 (2026-10-20)
      },
    });
  });

  // OMS-REG-DB-01.45 — between thresholds: today + first … today + second,
  // whole days from the store preferences.
  it('between-thresholds spans today+first … today+second days', () => {
    expect(
      filterOf(expiringBetweenThresholdsStockPath(wednesday, 100, 200))
    ).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-10-30', // +100d
        beforeOrEqualTo: '2027-02-07', // +200d
      },
    });
  });
});

describe('items paths', () => {
  // The drift guard deepLinks.ts points at: its restated slice of the items
  // list's UI filter contract (the module itself may not import the real one —
  // tsconfig.plugins compiles the SDK graph without the `@/` alias) must stay
  // assignable to the list's own ItemsListFilter. A renamed lens or regrouped
  // filter fails this file's compile, app-side.
  it('the restated items filter slice conforms to the list contract', () => {
    expectTypeOf<ItemsDeepLinkFilter>().toMatchTypeOf<ItemsListFilter>();
  });
  // OMS-REG-DB-01.47 — out of stock: the list's own out-of-stock lens, which
  // the list expands to the wire filter itself.
  it('out-of-stock → lens out-of-stock on the item catalogue', () => {
    expect(outOfStockItemsPath().startsWith('catalogue/items?')).toBe(true);
    expect(filterOf(outOfStockItemsPath())).toEqual({ lens: 'out-of-stock' });
  });

  // OMS-REG-DB-01.49 — low stock: months of stock ≤ the caller's understock
  // threshold.
  it('low stock → months-of-stock "to" = understock months', () => {
    expect(filterOf(lowStockItemsPath(3))).toEqual({
      monthsOfStock: { to: 3 },
    });
  });
});
