// Stat-link builders (spec/dashboard/rules.md § navigation correspondence,
// OMS-REG-DB-01.55): every stat links into the list holding exactly the records it counts,
// so the filter each link applies restates the count's definition. The
// dashboard owns WHAT each stat filters by; the target list owns the URL
// encoding — here that is the shared `?query=` JSON param (kdd/url-structure),
// with the filter object conforming to the target list's generated GraphQL
// filter input (kdd/type-safety: type-only imports of the target lists' own
// filter types, so a drift in their contract stops compiling here).
//
// Lists that don't exist yet (internal orders, customer requisitions, the item
// catalogue) get their registered placeholder, unfiltered — they begin
// filtering once the list ships (contract.md § navigation correspondence,
// OMS-REG-DB-01.57).
//
// Pure: `today` is injected so the window maths is unit-testable.

import {
  addDays,
  dateToIsoDate,
  startOfWeek,
  utcBoundsFromLocalDays,
} from '../../ui/elements/inputs/dateTimeConvert';
import type { InboundListFilter } from '../inbound-shipments/list/listFilters';
import type { InternalOrderFilter } from '../internal-orders/list/listFilters';
import type { OutboundFilter } from '../outbound-shipments/list/listFilters';
import type { StockFilter } from '../stock/list/listFilters';
import type { ItemsListFilter } from '../items/list/itemFilter';

// "Expiring soon" / the soon link's window, in days — the app's client constant
// (rules.md § thresholds; the server default of 7 is a fallback the app never
// relies on).
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

// ── Replenishment ────────────────────────────────────────────────────────────
// Internal vs external: the inbound list's URL contract carries the origin as
// its client-only `kind` filter. `fromPurchaseOrder` is exactly the external
// (PO-linked) count's set, so the external panel's links carry it. "Internal"
// (manual ∪ fromInternalOrder) has no single selectable value in that contract,
// so the internal panel's links carry window/status only — recorded fallback
// (contract.md § navigation correspondence; build report).
const inboundKind = (external: boolean) =>
  external ? { kind: 'fromPurchaseOrder' as const } : {};

export const inboundListHref = (storeId: string, external = false): string =>
  listHref(storeId, 'replenishment/inbound-shipment', {
    ...inboundKind(external),
  } satisfies InboundListFilter);

// The date windows are explicit from–to ranges matching the count window
// (contract.md § navigation correspondence): today spans start of day to end of
// day; this week spans Monday to end of Sunday.
export const inboundTodayHref = (
  storeId: string,
  today: Date,
  external = false
): string =>
  listHref(storeId, 'replenishment/inbound-shipment', {
    createdDatetime: dayRange('dateTime', today, today),
    ...inboundKind(external),
  } satisfies InboundListFilter);

export const inboundThisWeekHref = (
  storeId: string,
  today: Date,
  external = false
): string =>
  listHref(storeId, 'replenishment/inbound-shipment', {
    createdDatetime: dayRange(
      'dateTime',
      startOfWeek(today),
      addDays(startOfWeek(today), 6)
    ),
    ...inboundKind(external),
  } satisfies InboundListFilter);

// Not delivered = New/Shipped (rules.md § inbound shipments; OMS-REG-DB-01.35).
export const inboundNotDeliveredHref = (
  storeId: string,
  external = false
): string =>
  listHref(storeId, 'replenishment/inbound-shipment', {
    status: { equalAny: ['NEW', 'SHIPPED'] },
    ...inboundKind(external),
  } satisfies InboundListFilter);

export const internalOrderListHref = (storeId: string): string =>
  listHref(storeId, 'replenishment/internal-order');

// Draft = request requisitions still in Draft (rules.md § internal orders;
// OMS-REG-DB-01.40) — the internal-order list's single-select status filter.
export const internalOrderDraftHref = (storeId: string): string =>
  listHref(storeId, 'replenishment/internal-order', {
    status: { equalTo: 'DRAFT' },
  } satisfies InternalOrderFilter);

// ── Distribution ─────────────────────────────────────────────────────────────

export const outboundListHref = (storeId: string): string =>
  listHref(storeId, 'distribution/outbound-shipment');

// Not shipped = New/Allocated/Picked (rules.md § outbound shipments; OMS-REG-DB-01.37).
export const outboundNotShippedHref = (storeId: string): string =>
  listHref(storeId, 'distribution/outbound-shipment', {
    status: { equalAny: ['NEW', 'ALLOCATED', 'PICKED'] },
  } satisfies OutboundFilter);

// Customer-requisition list: registered placeholder (vertical not built yet).
export const customerRequisitionListHref = (storeId: string): string =>
  listHref(storeId, 'distribution/customer-requisition');

// ── Inventory ────────────────────────────────────────────────────────────────

export const stockListHref = (storeId: string): string =>
  listHref(storeId, 'inventory/stock');

// Expired: expiry ≤ today (OMS-REG-DB-01.41).
export const expiredHref = (storeId: string, today: Date): string =>
  listHref(storeId, 'inventory/stock', {
    expiryDate: dayRange('date', null, today),
  } satisfies StockFilter);

// Expiring soon: tomorrow … today + 30d — exactly the count's window (the count
// subtracts expired, so today's expiries belong to the expired stat). Diverges
// from the current app's today … today + 1 calendar month link (D74).
export const expiringSoonHref = (storeId: string, today: Date): string =>
  listHref(storeId, 'inventory/stock', {
    expiryDate: dayRange(
      'date',
      addDays(today, 1),
      addDays(today, DAYS_TILL_EXPIRED)
    ),
  } satisfies StockFilter);

// Next three months: the fixed 30–89-day slice (OMS-REG-DB-01.44 — the 90th day excluded).
export const expiringNextThreeMonthsHref = (
  storeId: string,
  today: Date
): string =>
  listHref(storeId, 'inventory/stock', {
    expiryDate: dayRange('date', addDays(today, 30), addDays(today, 89)),
  } satisfies StockFilter);

// Between thresholds: today + first … today + second (whole days — OMS-REG-DB-01.45).
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

// Item catalogue (spec/items). The stock-level stats link into this list
// filtered to the records each counts (OMS-REG-DB-01.55). The dashboard conforms to the
// list's OWN filter contract — the UI-side `ItemsListFilter` its
// `useUrlQueryState` reads (`lens` / `atRisk` / min-max months-of-stock), which
// the list expands to the wire `ItemFilterInput` itself. That vocabulary is the
// list's, not contract.md's guessed `stockStatus` / `productsAtRiskOfBeingOutOfStock`
// (candidate spec refinement — see the build report). Total items and the panel
// title use the unfiltered catalogue.

export const itemCatalogueHref = (storeId: string): string =>
  listHref(storeId, 'catalogue/items');

// Out of stock (recently used): zero on hand + recent consumption (OMS-REG-DB-01.48 count).
export const itemsOutOfStockRecentlyUsedHref = (storeId: string): string =>
  listHref(storeId, 'catalogue/items', {
    lens: 'out-of-stock-recent',
  } satisfies ItemsListFilter);

// Out of stock (all items): zero on hand (OMS-REG-DB-01.47 count).
export const itemsOutOfStockHref = (storeId: string): string =>
  listHref(storeId, 'catalogue/items', {
    lens: 'out-of-stock',
  } satisfies ItemsListFilter);

// At risk of stock-out (OMS-REG-DB-01.51 count) — the list's at-risk lens.
export const itemsAtRiskHref = (storeId: string): string =>
  listHref(storeId, 'catalogue/items', {
    atRisk: 'at-risk',
  } satisfies ItemsListFilter);

// Low stock: months of stock below the understock threshold (OMS-REG-DB-01.49 count).
export const itemsLowStockHref = (
  storeId: string,
  understockMonths: number
): string =>
  listHref(storeId, 'catalogue/items', {
    maxMonthsOfStock: understockMonths,
  } satisfies ItemsListFilter);

// High stock: months of stock above the overstock threshold (OMS-REG-DB-01.50 count).
export const itemsHighStockHref = (
  storeId: string,
  overstockMonths: number
): string =>
  listHref(storeId, 'catalogue/items', {
    minMonthsOfStock: overstockMonths,
  } satisfies ItemsListFilter);

// Overstocked: months of stock above the over-stock-alert threshold (OMS-REG-DB-01.52
// count) — a different threshold from high stock (rules § stock levels).
export const itemsOverstockedHref = (
  storeId: string,
  overstockAlertMonths: number
): string =>
  listHref(storeId, 'catalogue/items', {
    minMonthsOfStock: overstockAlertMonths,
  } satisfies ItemsListFilter);
