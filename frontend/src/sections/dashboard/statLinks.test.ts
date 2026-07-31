import { describe, expect, it } from 'vitest';
import {
  DAYS_TILL_EXPIRED,
  expiredHref,
  expiringBetweenThresholdsHref,
  expiringNextThreeMonthsHref,
  expiringSoonHref,
  inboundListHref,
  inboundNotDeliveredHref,
  inboundThisWeekHref,
  inboundTodayHref,
  internalOrderDraftHref,
  internalOrderListHref,
  customerRequisitionListHref,
  customerRequisitionNewHref,
  customerRequisitionEmergencyHref,
  itemCatalogueHref,
  itemsAtRiskHref,
  itemsHighStockHref,
  itemsLowStockHref,
  itemsOutOfStockHref,
  itemsOutOfStockRecentlyUsedHref,
  itemsOverstockedHref,
  outboundNotShippedHref,
} from './statLinks';

// The stat links' navigation correspondence (spec/dashboard/rules.md §
// navigation correspondence): each link's filter restates the count's
// definition, so the number and the opened list describe the same set.
// Behaviours cited from spec/dashboard/cases/.

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
  // OMS-REG-DB-01.55, OMS-REG-DB-01.33/.34 — the date windows are explicit
  // from–to ranges matching the count window (contract.md § navigation
  // correspondence): today spans start of day to end of day; this week
  // spans Monday to end of Sunday. Bounds are the LOCAL day widened to UTC
  // instants (#456); expected values built with the local Date constructor so
  // the assertions hold in any zone.
  it('OMS-REG-DB-01.55: inbound today is a from–to range over the whole day', () => {
    expect(filterOf(inboundTodayHref('s1', wednesday))).toEqual({
      createdDatetime: {
        afterOrEqualTo: new Date(2026, 6, 22).toISOString(),
        beforeOrEqualTo: new Date(2026, 6, 22, 23, 59, 59, 999).toISOString(),
      },
    });
  });

  it('OMS-REG-DB-01.55: inbound this-week spans Monday to end of Sunday', () => {
    expect(filterOf(inboundThisWeekHref('s1', wednesday))).toEqual({
      createdDatetime: {
        afterOrEqualTo: new Date(2026, 6, 20).toISOString(),
        beforeOrEqualTo: new Date(2026, 6, 26, 23, 59, 59, 999).toISOString(),
      },
    });
  });

  it('OMS-REG-DB-01.55: inbound not-delivered filters status to New/Shipped', () => {
    expect(filterOf(inboundNotDeliveredHref('s1'))).toEqual({
      status: { equalAny: ['NEW', 'SHIPPED'] },
    });
  });

  // OMS-REG-DB-01.55, OMS-REG-DB-01.36 — the external panel's links carry the
  // inbound list's origin filter: kind=fromPurchaseOrder is exactly the
  // PO-linked set the external counts use (contract § navigation
  // correspondence). Internal links stay kind-less — "internal" (manual ∪
  // from-internal-order) has no single selectable kind value (recorded
  // fallback), which the kind-free assertions above pin.
  it('OMS-REG-DB-01.55: external inbound stats add kind=fromPurchaseOrder', () => {
    expect(filterOf(inboundTodayHref('s1', wednesday, true))).toEqual({
      createdDatetime: {
        afterOrEqualTo: new Date(2026, 6, 22).toISOString(),
        beforeOrEqualTo: new Date(2026, 6, 22, 23, 59, 59, 999).toISOString(),
      },
      kind: 'fromPurchaseOrder',
    });
    expect(filterOf(inboundThisWeekHref('s1', wednesday, true))).toMatchObject({
      kind: 'fromPurchaseOrder',
    });
    expect(filterOf(inboundNotDeliveredHref('s1', true))).toEqual({
      status: { equalAny: ['NEW', 'SHIPPED'] },
      kind: 'fromPurchaseOrder',
    });
  });

  it('OMS-REG-DB-01.55: external panel title link is scoped to the external kind; internal is bare', () => {
    expect(inboundListHref('s1')).toBe('/s1/replenishment/inbound-shipment');
    expect(filterOf(inboundListHref('s1', true))).toEqual({
      kind: 'fromPurchaseOrder',
    });
  });

  // OMS-REG-DB-01.55, OMS-REG-DB-01.40 — draft: the internal-order list's
  // single-select status filter restates the count (request requisitions in
  // Draft); the panel title stays the unfiltered list.
  it('OMS-REG-DB-01.55/.40: internal-order draft filters status to Draft; title is bare', () => {
    expect(filterOf(internalOrderDraftHref('s1'))).toEqual({
      status: { equalTo: 'DRAFT' },
    });
    expect(internalOrderListHref('s1')).toBe(
      '/s1/replenishment/internal-order'
    );
  });
});

describe('distribution links', () => {
  // OMS-REG-DB-01.55, OMS-REG-DB-01.37 — not shipped = New/Allocated/Picked
  // exactly (Shipped and later excluded).
  it('OMS-REG-DB-01.55: outbound not-shipped filters status to New/Allocated/Picked', () => {
    expect(filterOf(outboundNotShippedHref('s1'))).toEqual({
      status: { equalAny: ['NEW', 'ALLOCATED', 'PICKED'] },
    });
  });

  // OMS-REG-DB-01.59 — the panel title is the only unfiltered requisition
  // link: it opens the whole list (contract § navigation correspondence).
  it('OMS-REG-DB-01.59: the customer-requisition panel title opens the list unfiltered', () => {
    expect(customerRequisitionListHref('s1')).toBe(
      '/s1/distribution/customer-requisition'
    );
  });

  // OMS-REG-DB-01.59, .38 — new: response requisitions in New. `type` is the
  // list's own pinned RESPONSE, never carried by the link.
  it('OMS-REG-DB-01.59: customer-requisition new filters status to New', () => {
    expect(filterOf(customerRequisitionNewHref('s1'))).toEqual({
      status: { equalTo: 'NEW' },
    });
  });

  // OMS-REG-DB-01.59, .39 — emergency is the New set narrowed to emergency, so
  // its filter is the new stat's plus isEmergency (the counts' subset relation).
  it('OMS-REG-DB-01.59: customer-requisition emergency filters New + emergency', () => {
    expect(filterOf(customerRequisitionEmergencyHref('s1'))).toEqual({
      status: { equalTo: 'NEW' },
      isEmergency: true,
    });
    expect(filterOf(customerRequisitionEmergencyHref('s1'))).toMatchObject(
      filterOf(customerRequisitionNewHref('s1'))
    );
  });
});

describe('inventory links', () => {
  // OMS-REG-DB-01.55, OMS-REG-DB-01.41 — expired: expiry on or before today.
  it('OMS-REG-DB-01.55: expired filters expiry ≤ today', () => {
    expect(filterOf(expiredHref('s1', wednesday))).toEqual({
      expiryDate: { beforeOrEqualTo: '2026-07-22' },
    });
  });

  // OMS-REG-DB-01.55, OMS-REG-DB-01.42 — expiring soon: exactly the count's
  // window, (today, today + 30d] — today's expiries are the expired
  // stat's (D71).
  it('OMS-REG-DB-01.55: expiring soon spans tomorrow … today + 30 days', () => {
    expect(DAYS_TILL_EXPIRED).toBe(30);
    expect(filterOf(expiringSoonHref('s1', wednesday))).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-07-23', // tomorrow — today itself is "expired"
        beforeOrEqualTo: '2026-08-21', // +30d
      },
    });
  });

  // OMS-REG-DB-01.55, OMS-REG-DB-01.44 — the fixed 30–89-day slice: the 90th
  // day is excluded.
  it('OMS-REG-DB-01.55/.44: next-three-months spans day 30 … day 89 (90 excluded)', () => {
    expect(filterOf(expiringNextThreeMonthsHref('s1', wednesday))).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-08-21', // +30d
        beforeOrEqualTo: '2026-10-19', // +89d — NOT +90 (2026-10-20)
      },
    });
  });

  // OMS-REG-DB-01.55, OMS-REG-DB-01.45 — between thresholds: today + first …
  // today + second, whole days from the store preferences.
  it('OMS-REG-DB-01.55/.45: between-thresholds spans today+first … today+second days', () => {
    expect(
      filterOf(expiringBetweenThresholdsHref('s1', wednesday, 100, 200))
    ).toEqual({
      expiryDate: {
        afterOrEqualTo: '2026-10-30', // +100d
        beforeOrEqualTo: '2027-02-07', // +200d
      },
    });
  });

  // OMS-REG-DB-01.55 — the stock-level stats link into the item catalogue
  // filtered to the records each counts, conforming to the list's OWN filter
  // contract (ItemsListFilter: lens / atRisk / months-of-stock), verified by
  // decoding the emitted link through that shape.
  it('OMS-REG-DB-01.55/.47: out-of-stock (all) → lens out-of-stock', () => {
    expect(filterOf(itemsOutOfStockHref('s1'))).toEqual({
      lens: 'out-of-stock',
    });
  });

  it('OMS-REG-DB-01.55/.48: out-of-stock (recently used) → lens out-of-stock-recent', () => {
    expect(filterOf(itemsOutOfStockRecentlyUsedHref('s1'))).toEqual({
      lens: 'out-of-stock-recent',
    });
  });

  it('OMS-REG-DB-01.55/.51: at-risk → the list at-risk lens', () => {
    expect(filterOf(itemsAtRiskHref('s1'))).toEqual({ atRisk: 'at-risk' });
  });

  // OMS-REG-DB-01.55, OMS-REG-DB-01.49 — low stock: months of stock ≤ the
  // understock threshold.
  it('OMS-REG-DB-01.55/.49: low stock → maxMonthsOfStock = understock months', () => {
    expect(filterOf(itemsLowStockHref('s1', 3))).toEqual({
      maxMonthsOfStock: 3,
    });
  });

  // OMS-REG-DB-01.55/.50 — high stock: months of stock ≥ the overstock
  // threshold.
  it('OMS-REG-DB-01.55/.50: high stock → minMonthsOfStock = overstock months', () => {
    expect(filterOf(itemsHighStockHref('s1', 6))).toEqual({
      minMonthsOfStock: 6,
    });
  });

  // OMS-REG-DB-01.55/.52 — overstocked uses the over-stock-ALERT threshold, a
  // different knob from high stock (rules § stock levels).
  it('OMS-REG-DB-01.55/.52: overstocked → minMonthsOfStock = over-stock-alert months', () => {
    expect(filterOf(itemsOverstockedHref('s1', 9))).toEqual({
      minMonthsOfStock: 9,
    });
  });

  // OMS-REG-DB-01.55 — total items (and the panel title) open the unfiltered
  // catalogue.
  it('OMS-REG-DB-01.55: total-items / panel link is the unfiltered catalogue', () => {
    expect(itemCatalogueHref('s1')).toBe('/s1/catalogue/items');
  });
});
