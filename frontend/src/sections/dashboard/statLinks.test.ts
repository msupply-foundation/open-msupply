import { describe, expect, it } from 'vitest';
import {
  DAYS_TILL_EXPIRED,
  expiredHref,
  expiringBetweenThresholdsHref,
  expiringNextThreeMonthsHref,
  expiringSoonHref,
  inboundNotDeliveredHref,
  inboundThisWeekHref,
  inboundTodayHref,
  internalOrderListHref,
  customerRequisitionListHref,
  itemCatalogueHref,
  outboundNotShippedHref,
} from './statLinks';

// The stat links' navigation correspondence (spec/dashboard/rules.md §
// navigation correspondence): each link's filter restates the count's
// definition, so the number and the opened list describe the same set.
// Criteria cited from spec/dashboard/acceptance.md.

// Decode the `?query=` JSON a link carries for the target list.
const filterOf = (href: string): Record<string, unknown> => {
  const query = new URL(href, 'http://x').searchParams.get('query');
  expect(query).not.toBeNull();
  return (JSON.parse(query!) as { filter: Record<string, unknown> }).filter;
};

// A fixed Wednesday, local time. (addDays / startOfWeek are unit-tested with
// the shared module; here the windows are asserted via the built links.)
const wednesday = new Date(2026, 6, 22); // 2026-07-22

describe('replenishment links', () => {
  // AC-N1/AC-R1 — the date windows are explicit from–to ranges matching the
  // count window (contract.md § navigation correspondence): today spans start
  // of day to end of day; this week spans Monday to end of Sunday.
  // Bounds are the LOCAL day widened to UTC instants (#456); expected values
  // built with the local Date constructor so the assertions hold in any zone.
  it('AC-N1: inbound today is a from–to range over the whole local day', () => {
    expect(filterOf(inboundTodayHref('s1', wednesday))).toEqual({
      createdDatetime: {
        afterOrEqualTo: new Date(2026, 6, 22).toISOString(),
        beforeOrEqualTo: new Date(2026, 6, 22, 23, 59, 59, 999).toISOString(),
      },
    });
  });

  it('AC-N1: inbound this-week spans Monday to end of Sunday', () => {
    expect(filterOf(inboundThisWeekHref('s1', wednesday))).toEqual({
      createdDatetime: {
        afterOrEqualTo: new Date(2026, 6, 20).toISOString(),
        beforeOrEqualTo: new Date(2026, 6, 26, 23, 59, 59, 999).toISOString(),
      },
    });
  });

  it('AC-N1: inbound not-delivered filters status to New/Shipped', () => {
    expect(filterOf(inboundNotDeliveredHref('s1'))).toEqual({
      status: { equalAny: ['NEW', 'SHIPPED'] },
    });
  });

  // AC-N1 — the internal-order list is not built: its links land on the
  // registered placeholder, unfiltered.
  it('AC-N1: internal-order link is the registered placeholder, unfiltered', () => {
    expect(internalOrderListHref('s1')).toBe(
      '/s1/replenishment/internal-order'
    );
  });
});

describe('distribution links', () => {
  // AC-N1/AC-T1 — not shipped = New/Allocated/Picked exactly (Shipped and
  // later excluded).
  it('AC-N1: outbound not-shipped filters status to New/Allocated/Picked', () => {
    expect(filterOf(outboundNotShippedHref('s1'))).toEqual({
      status: { equalAny: ['NEW', 'ALLOCATED', 'PICKED'] },
    });
  });

  it('AC-N1: customer-requisition link is the registered placeholder, unfiltered', () => {
    expect(customerRequisitionListHref('s1')).toBe(
      '/s1/distribution/customer-requisition'
    );
  });
});

describe('inventory links', () => {
  // AC-N1/AC-E1 — expired: expiry on or before today.
  it('AC-N1: expired filters expiry ≤ today', () => {
    expect(filterOf(expiredHref('s1', wednesday))).toEqual({
      expiryDate: { beforeOrEqualTo: '2026-07-22' },
    });
  });

  // AC-N1/AC-E2 — expiring soon: the same 30-day window the count uses.
  it('AC-N1: expiring soon spans today … today + 30 days', () => {
    expect(DAYS_TILL_EXPIRED).toBe(30);
    expect(filterOf(expiringSoonHref('s1', wednesday))).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-07-22',
        beforeOrEqualTo: '2026-08-21',
      },
    });
  });

  // AC-N1/AC-E3 — the fixed 30–89-day slice: the 90th day is excluded.
  it('AC-N1/AC-E3: next-three-months spans day 30 … day 89 (90 excluded)', () => {
    expect(filterOf(expiringNextThreeMonthsHref('s1', wednesday))).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-08-21', // +30d
        beforeOrEqualTo: '2026-10-19', // +89d — NOT +90 (2026-10-20)
      },
    });
  });

  // AC-N1/AC-E4 — between thresholds: today + first … today + second, whole
  // days from the store preferences.
  it('AC-N1/AC-E4: between-thresholds spans today+first … today+second days', () => {
    expect(
      filterOf(expiringBetweenThresholdsHref('s1', wednesday, 100, 200))
    ).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-10-30', // +100d
        beforeOrEqualTo: '2027-02-07', // +200d
      },
    });
  });

  // AC-N1 — the item catalogue is not built: every stock-level stat lands on
  // its registered placeholder, unfiltered (total items is unfiltered by
  // definition).
  it('AC-N1: item-catalogue links are the registered placeholder, unfiltered', () => {
    expect(itemCatalogueHref('s1')).toBe('/s1/catalogue/items');
  });
});
