/*
 * The typed deep-link builders (spec/plugins/sdk-contract.md § SDK surface —
 * the other half of Navigation, beside ./navigation.ts's route/link
 * primitives): a named, typo-proof target for each core list a plugin links
 * into, so a plugin never hand-encodes a host URL — neither the path nor the
 * target list's `?query=` filter contract (kdd/url-structure).
 *
 * Promoted from the dashboard's stat links (issue #304): the builders and
 * their windows are the dashboard's proven ones — each filter restates the
 * corresponding count's definition (spec/dashboard/rules.md § navigation
 * correspondence), so a figure and the list it opens describe the same set.
 * The dashboard's statLinks.ts now delegates here, which is what keeps the
 * two surfaces from drifting.
 *
 * The promotion changes VOCABULARY, not behaviour: statLinks' builders take a
 * storeId and return '/{store}/…', but on this surface the store is the
 * host's (the whole point of ./navigation.ts), so every builder returns a
 * store-relative PATH — exactly what `storeHref` (for an anchor) and
 * `navigateTo` (from code) take, query string included. Hence the `…Path`
 * names: path in, path out (navigation.ts § two vocabularies).
 *
 * The design call on types (#304): each filtered builder still `satisfies`
 * its target list's filter contract host-side, so drift in a list's contract
 * stops the HOST compiling — but none of those types is exported. The SDK
 * publishes domain scalars (a date, a threshold in months) and keeps the
 * filter vocabulary host-internal, per the sdk-contract rule that plugin
 * surfaces are SDK-owned shapes, never host feature types: a list is free to
 * rename a lens or regroup its filters without moving the plugin surface,
 * because the builders re-encode at that boundary. A filter a builder cannot
 * express is an SDK gap to file, not a licence to hand-build the query.
 *
 * How the checks are wired is constrained by the plugins tsconfig: the SDK's
 * import graph is ALSO compiled without the `@/` alias (tsconfig.plugins —
 * the guard that keeps host source out of plugins), so this module may only
 * import alias-free chains. The stock list's contract is the generated
 * filter input, whose chain is clean, so it is checked right here; the items
 * list's is a UI-side type living in a module that uses `@/`, so its slice is
 * restated below and pinned against the real contract in deepLinks.test.ts,
 * which compiles app-side.
 *
 * Pure: `today` is injected (a plugin passes its clock), so the window maths
 * is unit-testable — and builders never read session state, so they are safe
 * anywhere, including outside a component.
 *
 * Eager-surface note (kdd/bundling § the SDK-eager rule), as measured in
 * kdd/bundle-size-by-pr.md (#304): this module needs only the two small date
 * helpers (`addDays`, `dateToIsoDate`), which arrive through the existing
 * shared dateTimeConvert chunk — one the app entry already loads at boot — so
 * linking it costs the SDK no new download. The module itself splits out as a
 * small shared chunk linked by both importers (the SDK entry and the
 * dashboard's statLinks), fetched with whichever side loads first.
 */
import { addDays, dateToIsoDate } from '../ui/elements/inputs/dateTimeConvert';
import type { StockLinesVariables } from '../sections/stock/list/stock.generated';

// The stock list filter object, exactly the generated GraphQL filter shape —
// the same derivation as the list's own StockFilter (kdd/type-safety), taken
// from the generated file directly because the list's filter MODULE is not an
// alias-free chain (see above).
type StockFilter = NonNullable<StockLinesVariables['filter']>;

// The slice of the items list's UI filter contract these builders speak
// (`lens` / months-of-stock — the list expands them to the wire filter
// itself). Restated rather than imported (see above); deepLinks.test.ts pins
// it against the list's own ItemsListFilter, so a rename there still stops
// the tree compiling. Exported for that pin alone — not plugin surface.
export type ItemsDeepLinkFilter = {
  lens?: 'out-of-stock';
  monthsOfStock?: { to: number };
};

/**
 * "Expiring soon" / the soon window, in days — the app's client constant
 * (spec/dashboard/rules.md § thresholds; the server default of 7 is a
 * fallback the app never relies on). Exported so a plugin's own
 * `stockCounts(daysTillExpired:)` read and its expiring-soon link cannot
 * disagree about the window.
 */
export const DAYS_TILL_EXPIRED = 30;

/*
 * One shape for every list target: the store-relative path plus the `?query=`
 * filter the list's useUrlQueryState reads — partial state merges over the
 * list's defaults, so only the filter travels (kdd/url-structure).
 *
 * Host-shared, NOT plugin surface (not on the SDK barrel): a raw
 * (path, filter) pair is exactly the hand-encoding the named builders exist
 * to prevent. The dashboard's statLinks build their unpromoted links with it.
 */
export const listPath = (path: string, filter?: object): string => {
  if (!filter || Object.keys(filter).length === 0) return path;
  return `${path}?query=${encodeURIComponent(JSON.stringify({ filter }))}`;
};

// An inclusive expiry window over the `Date` scalar (plain ISO days — the
// stock list's expiryDate field), open-ended where a bound is null.
const dateRange = (from: Date | null, to: Date | null) => ({
  ...(from ? { afterOrEqualTo: dateToIsoDate(from) } : {}),
  ...(to ? { beforeOrEqualTo: dateToIsoDate(to) } : {}),
});

// ── Task-list targets ────────────────────────────────────────────────────────
// The unfiltered core lists a contribution launches into (e.g. the Cook
// Islands navigator's task tiles — plugins/cook_islands/ui-surface.md § S2).
// Each returns the path as the navigation registry spells it, from one place,
// so a plugin never spells (or misspells) a host route.

export const inboundShipmentListPath = (): string =>
  'replenishment/inbound-shipment';

export const outboundShipmentListPath = (): string =>
  'distribution/outbound-shipment';

export const internalOrderListPath = (): string =>
  'replenishment/internal-order';

/** One internal order's detail screen, by the order's id. */
export const internalOrderPath = (orderId: string): string =>
  `${internalOrderListPath()}/${orderId}`;

// Named for the record it reaches, which the UI calls a dispensing record
// (issue #551). The export keeps its original name so plugins built against it
// keep compiling; it is the returned path that moved.
export const dispensingListPath = (): string => 'dispensary/dispensing';

/** @deprecated Use {@link dispensingListPath} — the vertical is "Dispensing". */
export const prescriptionListPath = dispensingListPath;

export const stocktakeListPath = (): string => 'inventory/stocktakes';

/**
 * One stocktake's detail screen — the record page behind a count, which is
 * what the Cook Islands count log opens from a row
 * (plugins/cook_islands/stocktake/ui-surface.md § S5). A record path, not a
 * filtered list: it takes the record's id and nothing else. The segment is
 * URI-encoded so an id can never smuggle a path separator, though real ids
 * are host-minted UUIDs.
 */
export const stocktakeDetailPath = (stocktakeId: string): string =>
  `${stocktakeListPath()}/${encodeURIComponent(stocktakeId)}`;

// ── Stock ────────────────────────────────────────────────────────────────────

export const stockListPath = (): string => 'inventory/stock';

/** Expired: expiry ≤ today (OMS-REG-DB-01.41). */
export const expiredStockPath = (today: Date): string =>
  listPath(stockListPath(), {
    expiryDate: dateRange(null, today),
  } satisfies StockFilter);

/**
 * Expiring soon: tomorrow … today + 30d — exactly the `stockCounts`
 * expiring-soon window (the count subtracts expired, so today's expiries
 * belong to the expired set; OMS-REG-DB-01.42, D71).
 */
export const expiringSoonStockPath = (today: Date): string =>
  listPath(stockListPath(), {
    expiryDate: dateRange(addDays(today, 1), addDays(today, DAYS_TILL_EXPIRED)),
  } satisfies StockFilter);

/**
 * Expiring one to three months out: the fixed 30–89-day slice — exactly
 * `StockCounts.expiringInNextThreeMonths` (OMS-REG-DB-01.44; the 90th day
 * excluded).
 */
export const expiringNextThreeMonthsStockPath = (today: Date): string =>
  listPath(stockListPath(), {
    expiryDate: dateRange(addDays(today, 30), addDays(today, 89)),
  } satisfies StockFilter);

/**
 * Expiring between the store-configured expiry thresholds: today + first …
 * today + second, whole days (OMS-REG-DB-01.45) — the
 * `StockCounts.expiringBetweenThresholds` window, NOT the one-to-three-months
 * figure above.
 */
export const expiringBetweenThresholdsStockPath = (
  today: Date,
  firstDays: number,
  secondDays: number
): string =>
  listPath(stockListPath(), {
    expiryDate: dateRange(
      addDays(today, firstDays),
      addDays(today, secondDays)
    ),
  } satisfies StockFilter);

// ── Items ────────────────────────────────────────────────────────────────────
// The item catalogue, filtered to the records a stock-level count counts
// (OMS-REG-DB-01.55). The vocabulary is the list's OWN UI filter contract
// (lens / min-max months-of-stock), which the list expands to the wire filter
// itself — a plugin never meets either.

// Host-shared, NOT plugin surface (like listPath): the unfiltered catalogue
// is no committed plugin target yet, so only the host's own links use it.
export const itemCataloguePath = (): string => 'catalogue/items';

/**
 * Out of stock: zero on hand (the `ItemCounts.noStock` set,
 * OMS-REG-DB-01.47).
 */
export const outOfStockItemsPath = (): string =>
  listPath(itemCataloguePath(), {
    lens: 'out-of-stock',
  } satisfies ItemsDeepLinkFilter);

/**
 * Low stock: months of stock at or below the store's understock threshold
 * (the `ItemCounts.lowStock` set, OMS-REG-DB-01.49). The threshold is the
 * caller's — read it from the store preference, as the count query does.
 */
export const lowStockItemsPath = (understockMonths: number): string =>
  listPath(itemCataloguePath(), {
    monthsOfStock: { to: understockMonths },
  } satisfies ItemsDeepLinkFilter);
