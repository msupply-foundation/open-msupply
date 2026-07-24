import type { ItemsVariables } from './items.generated';

// Pure logic for the items list filter (spec/items S1 + rules "list population
// and visibility", "months-of-stock and at-risk filters", "custom fields").
//
// The UI's filter vocabulary is NOT the wire filter: the app exposes a single
// "stock-status lens" that EXPANDS to several ItemFilterInput fields, plus a
// base filter every query carries. buildItemFilter maps this UI state onto the
// generated ItemFilterInput (kdd/type-safety — the lens/at-risk choice is a UI
// concept, not a wire field; everything it produces conforms to the generated
// type). Kept pure + colocated so the population rules are unit-tested
// (AC-L1/L2/L4/L5/L6, AC-P2/P3) without standing up the screen.

export type WireFilter = NonNullable<ItemsVariables['filter']>;

// The single-choice stock-status lens (spec/items ui-surface S1 › Filters).
export type StockStatusLens =
  'in-stock' | 'in-stock-recent' | 'out-of-stock' | 'out-of-stock-recent';

export type AtRisk = 'at-risk' | 'not-at-risk';

// The UI-side filter state (URL-backed). Empty/undefined members are simply not
// applied. `lens` replaces the default visible-or-on-hand population.
// `null` members are allowed because FilterBar marks an added-but-empty chip
// with null; buildItemFilter treats null and undefined identically (not
// applied). Custom-field filters are a SEPARATE state slice on the list (the
// shared domain/customFields group → dynamicFilter), not part of this UI filter.
export type ItemsListFilter = {
  codeOrName?: string | null;
  lens?: StockStatusLens | null;
  minMonthsOfStock?: number | null;
  maxMonthsOfStock?: number | null;
  masterListId?: string | null;
  atRisk?: AtRisk | null;
};

// The stock-status lens → the ItemFilterInput fields it sets (spec/items
// contract "list population"). Note the wire traps encoded here: when a lens is
// active we DROP isVisibleOrOnHand (isVisible/hasStockOnHand are ignored while
// it is true), and withRecentConsumption is presence-only — we only ever set it
// to `true`, never `false` (false behaves as true server-side).
export const expandLens = (lens: StockStatusLens): Partial<WireFilter> => {
  switch (lens) {
    case 'in-stock':
      return { hasStockOnHand: true };
    case 'in-stock-recent':
      return { hasStockOnHand: true, withRecentConsumption: true };
    case 'out-of-stock':
      return { hasStockOnHand: false, isVisible: true };
    case 'out-of-stock-recent':
      return { hasStockOnHand: false, withRecentConsumption: true };
  }
};

// The UI filter state → the wire ItemFilterInput. Always carries the base
// population (active, stock-type). With no lens it adds isVisibleOrOnHand:true
// (the default visible-or-on-hand population, AC-L1); a lens REPLACES that with
// its own expansion (AC-L2). Search, master-list, MOS bounds, at-risk and
// custom-field property filters all combine as AND (AC-L3/L4/L5/L6, AC-P2).
export const buildItemFilter = (f: ItemsListFilter): WireFilter => {
  const filter: WireFilter = {
    isActive: true,
    type: { equalTo: 'STOCK' },
  };

  if (f.lens) Object.assign(filter, expandLens(f.lens));
  else filter.isVisibleOrOnHand = true;

  if (f.codeOrName) filter.codeOrName = { like: f.codeOrName };
  if (f.masterListId) filter.masterListId = { equalTo: f.masterListId };
  if (f.minMonthsOfStock != null) filter.minMonthsOfStock = f.minMonthsOfStock;
  if (f.maxMonthsOfStock != null) filter.maxMonthsOfStock = f.maxMonthsOfStock;
  if (f.atRisk) filter.productsAtRiskOfBeingOutOfStock = f.atRisk === 'at-risk';

  return filter;
};
