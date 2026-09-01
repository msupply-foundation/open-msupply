// Stat-link builders (spec/dashboard/rules.md § navigation correspondence,
// OMS-REG-DB-01.55): every stat links into the list holding exactly the
// records it counts, so the filter each link applies restates the count's
// definition. The dashboard owns WHAT each stat filters by; the target list
// owns the URL encoding — here that is the shared `?query=` JSON param
// (kdd/url-structure), with the filter object conforming to the target list's
// generated GraphQL filter input (kdd/type-safety: type-only imports of the
// target lists' own filter types, so a drift in their contract stops compiling
// here).
//
// The links a plugin can also build — the stock/items set and the bare task
// lists — are PROMOTED to the plugin SDK (@/plugin-sdk/deepLinks, issue #304)
// and delegated to from here, so the dashboard's links and the SDK's cannot
// drift. The SDK's vocabulary is store-relative paths (the store is the
// host's on that surface); these builders remain the store-prefixed hrefs the
// dashboard's own router links take, so each wraps its SDK path with the
// entered store.
//
// A list that doesn't exist yet gets its registered placeholder, unfiltered,
// and begins filtering once the list ships (contract.md § navigation
// correspondence, OMS-REG-DB-01.57) — no built-in stat is in that state now
// that the requisitions list has shipped.
//
// Pure: `today` is injected so the window maths is unit-testable.

import {
  addDays,
  dateToIsoDate,
  startOfWeek,
  utcBoundsFromLocalDays,
} from '@/ui/elements/inputs/dateTimeConvert';
import {
  expiredStockPath,
  expiringBetweenThresholdsStockPath,
  expiringNextThreeMonthsStockPath,
  expiringSoonStockPath,
  inboundShipmentListPath,
  internalOrderListPath,
  itemCataloguePath,
  listPath,
  lowStockItemsPath,
  outboundShipmentListPath,
  outOfStockItemsPath,
  stockListPath,
} from '@/plugin-sdk/deepLinks';
import type { InboundListFilter } from '@/sections/inbound-shipments/list/listFilters';
import type { InternalOrderFilter } from '@/sections/internal-orders/list/listFilters';
import type { OutboundFilter } from '@/sections/outbound-shipments/list/listFilters';
import type { RequisitionFilter } from '@/sections/requisitions/list/listFilters';
import type { ItemsListFilter } from '@/sections/items/list/itemFilter';

// The window constant travels with the promoted builders; the dashboard's
// stockCounts query still reads it from here.
export { DAYS_TILL_EXPIRED } from '@/plugin-sdk/deepLinks';

// A local-day window → a datetime field's filter bounds: each day widened to
// inclusive UTC instants via the shared conversion (#456). The remaining
// dashboard-only windows all filter `DateTime` scalars; the `Date`-scalar
// windows (stock expiry) live with the promoted builders.
const dayRange = (from: Date, to: Date) =>
  utcBoundsFromLocalDays(dateToIsoDate(from), dateToIsoDate(to));

// One link shape for every stat: the entered store prefixed onto the
// store-relative list target (path + `?query=` filter — the SDK's listPath,
// so the dashboard and the SDK share one encoding).
const withStore = (storeId: string, relativePath: string): string =>
  `/${storeId}/${relativePath}`;

const listHref = (storeId: string, path: string, filter?: object): string =>
  withStore(storeId, listPath(path, filter));

// ── Replenishment ────────────────────────────────────────────────────────────
// Internal vs external: the inbound list's URL contract carries the origin
// as its client-only `kind` filter. `fromPurchaseOrder` is exactly the
// external (PO-linked) count's set, so the external panel's links carry it.
// "Internal" (manual ∪ fromInternalOrder) has no single selectable value in
// that contract, so the internal panel's links carry window/status only —
// recorded fallback (contract.md § navigation correspondence; build report).
const inboundKind = (external: boolean) =>
  external ? { kind: 'fromPurchaseOrder' as const } : {};

export const inboundListHref = (storeId: string, external = false): string =>
  listHref(storeId, inboundShipmentListPath(), {
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
  listHref(storeId, inboundShipmentListPath(), {
    createdDatetime: dayRange(today, today),
    ...inboundKind(external),
  } satisfies InboundListFilter);

export const inboundThisWeekHref = (
  storeId: string,
  today: Date,
  external = false
): string =>
  listHref(storeId, inboundShipmentListPath(), {
    createdDatetime: dayRange(startOfWeek(today), addDays(startOfWeek(today), 6)),
    ...inboundKind(external),
  } satisfies InboundListFilter);

// Not delivered = New/Shipped (rules.md § inbound shipments; OMS-REG-DB-01.35).
export const inboundNotDeliveredHref = (
  storeId: string,
  external = false
): string =>
  listHref(storeId, inboundShipmentListPath(), {
    status: { equalAny: ['NEW', 'SHIPPED'] },
    ...inboundKind(external),
  } satisfies InboundListFilter);

export const internalOrderListHref = (storeId: string): string =>
  withStore(storeId, internalOrderListPath());

// Draft = request requisitions still in Draft (rules.md § internal orders;
// OMS-REG-DB-01.40) — the internal-order list's multi-select status filter,
// one value ticked.
export const internalOrderDraftHref = (storeId: string): string =>
  listHref(storeId, internalOrderListPath(), {
    status: { equalAny: ['DRAFT'] },
  } satisfies InternalOrderFilter);

// ── Distribution ─────────────────────────────────────────────────────────────

export const outboundListHref = (storeId: string): string =>
  withStore(storeId, outboundShipmentListPath());

// Not shipped = New/Allocated/Picked (rules.md § outbound shipments;
// OMS-REG-DB-01.37).
export const outboundNotShippedHref = (storeId: string): string =>
  listHref(storeId, outboundShipmentListPath(), {
    status: { equalAny: ['NEW', 'ALLOCATED', 'PICKED'] },
  } satisfies OutboundFilter);

// Customer requisitions — the requisitions list (response requisitions). Its
// own filter contract, unremapped; `type` is pinned to RESPONSE by the list
// itself, so no link carries it. The panel title opens the list unfiltered.
export const customerRequisitionListHref = (storeId: string): string =>
  listHref(storeId, 'distribution/customer-requisition');

// New = response requisitions in New (rules.md § customer requisitions;
// OMS-REG-DB-01.38, .59) — the list's multi-select status filter, one value
// ticked.
export const customerRequisitionNewHref = (storeId: string): string =>
  listHref(storeId, 'distribution/customer-requisition', {
    status: { equalAny: ['NEW'] },
  } satisfies RequisitionFilter);

// Emergency (new) = the New set narrowed to emergency — a subset of the stat
// above (OMS-REG-DB-01.39, .59). Both the stat and the list's `isEmergency`
// control are gated by the same program-module preference, so this link never
// carries a filter the target list would hide.
export const customerRequisitionEmergencyHref = (storeId: string): string =>
  listHref(storeId, 'distribution/customer-requisition', {
    status: { equalAny: ['NEW'] },
    isEmergency: true,
  } satisfies RequisitionFilter);

// ── Inventory ────────────────────────────────────────────────────────────────
// The stock and item-level links are the promoted SDK builders, store-wrapped;
// their windows and OMS-REG-DB citations live with them
// (@/plugin-sdk/deepLinks).

export const stockListHref = (storeId: string): string =>
  withStore(storeId, stockListPath());

export const expiredHref = (storeId: string, today: Date): string =>
  withStore(storeId, expiredStockPath(today));

export const expiringSoonHref = (storeId: string, today: Date): string =>
  withStore(storeId, expiringSoonStockPath(today));

export const expiringNextThreeMonthsHref = (
  storeId: string,
  today: Date
): string => withStore(storeId, expiringNextThreeMonthsStockPath(today));

export const expiringBetweenThresholdsHref = (
  storeId: string,
  today: Date,
  firstDays: number,
  secondDays: number
): string =>
  withStore(
    storeId,
    expiringBetweenThresholdsStockPath(today, firstDays, secondDays)
  );

// Item catalogue (spec/items). The stock-level stats link into this list
// filtered to the records each counts (OMS-REG-DB-01.55). The dashboard
// conforms to the list's OWN filter contract — the UI-side `ItemsListFilter`
// its `useUrlQueryState` reads (`lens` / `atRisk` / min-max months-of-stock),
// which the list expands to the wire `ItemFilterInput` itself. That vocabulary
// is the list's, not contract.md's guessed `stockStatus` /
// `productsAtRiskOfBeingOutOfStock` (candidate spec refinement — see the build
// report). Total items and the panel title use the unfiltered catalogue.

export const itemCatalogueHref = (storeId: string): string =>
  withStore(storeId, itemCataloguePath());

// Out of stock (recently used): zero on hand + recent consumption
// (OMS-REG-DB-01.48 count).
export const itemsOutOfStockRecentlyUsedHref = (storeId: string): string =>
  listHref(storeId, itemCataloguePath(), {
    lens: 'out-of-stock-recent',
  } satisfies ItemsListFilter);

// Out of stock (all items): zero on hand (OMS-REG-DB-01.47 count).
export const itemsOutOfStockHref = (storeId: string): string =>
  withStore(storeId, outOfStockItemsPath());

// At risk of stock-out (OMS-REG-DB-01.51 count) — the list's at-risk lens.
export const itemsAtRiskHref = (storeId: string): string =>
  listHref(storeId, itemCataloguePath(), {
    atRisk: 'at-risk',
  } satisfies ItemsListFilter);

// Low stock: months of stock below the understock threshold (OMS-REG-DB-01.49
// count).
export const itemsLowStockHref = (
  storeId: string,
  understockMonths: number
): string => withStore(storeId, lowStockItemsPath(understockMonths));

// High stock: months of stock above the overstock threshold (OMS-REG-DB-01.50
// count).
export const itemsHighStockHref = (
  storeId: string,
  overstockMonths: number
): string =>
  listHref(storeId, itemCataloguePath(), {
    monthsOfStock: { from: overstockMonths },
  } satisfies ItemsListFilter);

// Overstocked: months of stock above the over-stock-alert threshold
// (OMS-REG-DB-01.52 count) — a different threshold from high stock (rules §
// stock levels).
export const itemsOverstockedHref = (
  storeId: string,
  overstockAlertMonths: number
): string =>
  listHref(storeId, itemCataloguePath(), {
    monthsOfStock: { from: overstockAlertMonths },
  } satisfies ItemsListFilter);
