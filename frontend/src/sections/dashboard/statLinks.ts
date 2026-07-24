// Stat-link builders (spec/dashboard/rules.md § navigation correspondence,
// AC-N1): every stat links into the list holding exactly the records it
// counts, so the filter each link applies restates the count's definition.
// The dashboard owns WHAT each stat filters by; the target list owns the URL
// encoding — here that is the shared `?query=` JSON param (kdd/url-structure),
// with the filter object conforming to the target list's generated GraphQL
// filter input (kdd/type-safety: type-only imports of the target lists' own
// filter types, so a drift in their contract stops compiling here).
//
// Lists that don't exist yet (internal orders, customer requisitions, the item
// catalogue) get their registered placeholder, unfiltered — they begin
// filtering once the list ships (contract.md § navigation correspondence,
// AC-N1).
//
// Pure: `today` is injected so the window maths is unit-testable.

import {
  addDays,
  dateToIsoDate,
  startOfWeek,
  utcBoundsFromLocalDays,
} from '../../ui/elements/inputs/dateTimeConvert';
import type { InboundFilter } from '../inbound-shipments/list/listFilters';
import type { OutboundFilter } from '../outbound-shipments/list/listFilters';
import type { StockFilter } from '../stock/list/listFilters';

// "Expiring soon" / the soon link's window, in days — the app's client
// constant (rules.md § thresholds; the server default of 7 is a fallback the
// app never relies on).
export const DAYS_TILL_EXPIRED = 30;

// A local-day window → a dated field's filter bounds. `type` is REQUIRED (like
// FilterDateRange): 'dateTime' widens each day to inclusive UTC instants via
// the shared conversion (#456); 'date' passes the plain ISO day through
// (`Date` scalar). Open-ended when a bound is null. So every dated stat link
// declares its field's scalar and gets the right conversion — none hand-rolls it.
const dayRange = (
  type: 'date' | 'dateTime',
  from: Date | null,
  to: Date | null
) => {
  const a = from ? dateToIsoDate(from) : null;
  const b = to ? dateToIsoDate(to) : null;
  if (type === 'dateTime') return utcBoundsFromLocalDays(a, b);
  return a || b
    ? {
        ...(a ? { afterOrEqualTo: a } : {}),
        ...(b ? { beforeOrEqualTo: b } : {}),
      }
    : null;
};

// One link shape for every stat: the target list path (store-relative) plus
// the `?query=` filter the list's useUrlQueryState reads (partial state merges
// over the list's defaults, so only the filter travels).
const listHref = (storeId: string, path: string, filter?: object): string => {
  const base = `/${storeId}/${path}`;
  if (!filter || Object.keys(filter).length === 0) return base;
  return `${base}?query=${encodeURIComponent(JSON.stringify({ filter }))}`;
};

// ── Replenishment ──────────────────────────────────────────────────────────
// The inbound list's internal/external kind is a permission-scope variable,
// not part of its URL filter contract, so the kind dimension is not yet
// expressible in a link (flagged in the build report); the window/status
// filters below are what the list contracts for today.

export const inboundListHref = (storeId: string): string =>
  listHref(storeId, 'replenishment/inbound-shipment');

// The date windows are explicit from–to ranges matching the count window
// (contract.md § navigation correspondence): today spans start of day to end
// of day; this week spans Monday to end of Sunday.
export const inboundTodayHref = (storeId: string, today: Date): string =>
  listHref(storeId, 'replenishment/inbound-shipment', {
    createdDatetime: dayRange('dateTime', today, today),
  } satisfies InboundFilter);

export const inboundThisWeekHref = (storeId: string, today: Date): string =>
  listHref(storeId, 'replenishment/inbound-shipment', {
    createdDatetime: dayRange(
      'dateTime',
      startOfWeek(today),
      addDays(startOfWeek(today), 6)
    ),
  } satisfies InboundFilter);

// Not delivered = New/Shipped (rules.md § inbound shipments; AC-R1).
export const inboundNotDeliveredHref = (storeId: string): string =>
  listHref(storeId, 'replenishment/inbound-shipment', {
    status: { equalAny: ['NEW', 'SHIPPED'] },
  } satisfies InboundFilter);

// Internal-order list: registered placeholder (vertical not built yet).
export const internalOrderListHref = (storeId: string): string =>
  listHref(storeId, 'replenishment/internal-order');

// ── Distribution ───────────────────────────────────────────────────────────

export const outboundListHref = (storeId: string): string =>
  listHref(storeId, 'distribution/outbound-shipment');

// Not shipped = New/Allocated/Picked (rules.md § outbound shipments; AC-T1).
export const outboundNotShippedHref = (storeId: string): string =>
  listHref(storeId, 'distribution/outbound-shipment', {
    status: { equalAny: ['NEW', 'ALLOCATED', 'PICKED'] },
  } satisfies OutboundFilter);

// Customer-requisition list: registered placeholder (vertical not built yet).
export const customerRequisitionListHref = (storeId: string): string =>
  listHref(storeId, 'distribution/customer-requisition');

// ── Inventory ──────────────────────────────────────────────────────────────

export const stockListHref = (storeId: string): string =>
  listHref(storeId, 'inventory/stock');

// Expired: expiry ≤ today (AC-E1).
export const expiredHref = (storeId: string, today: Date): string =>
  listHref(storeId, 'inventory/stock', {
    expiryDate: dayRange('date', null, today),
  } satisfies StockFilter);

// Expiring soon: today … today + 30d (contract.md § navigation
// correspondence — the captured link window for the soon stat).
export const expiringSoonHref = (storeId: string, today: Date): string =>
  listHref(storeId, 'inventory/stock', {
    expiryDate: dayRange('date', today, addDays(today, DAYS_TILL_EXPIRED)),
  } satisfies StockFilter);

// Next three months: the fixed 30–89-day slice (AC-E3 — the 90th day
// excluded).
export const expiringNextThreeMonthsHref = (
  storeId: string,
  today: Date
): string =>
  listHref(storeId, 'inventory/stock', {
    expiryDate: dayRange('date', addDays(today, 30), addDays(today, 89)),
  } satisfies StockFilter);

// Between thresholds: today + first … today + second (whole days — AC-E4).
export const expiringBetweenThresholdsHref = (
  storeId: string,
  today: Date,
  firstDays: number,
  secondDays: number
): string =>
  listHref(storeId, 'inventory/stock', {
    expiryDate: dayRange(
      'date',
      addDays(today, firstDays),
      addDays(today, secondDays)
    ),
  } satisfies StockFilter);

// Item catalogue: registered placeholder (vertical not built yet) — every
// stock-level stat lands here unfiltered until the list ships, including
// total items, whose target is the unfiltered catalogue by definition.
export const itemCatalogueHref = (storeId: string): string =>
  listHref(storeId, 'catalogue/items');
