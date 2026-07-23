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

// One custom-field filter value, tagged by the definition's value type. option
// carries the chosen option id PLUS its descendant ids (a parent matches its
// descendants — AC-P2); number/date carry an exclusive-free range.
export type CustomFieldFilterValue =
  | { type: 'TEXT'; contains: string }
  | { type: 'BOOLEAN'; value: boolean }
  | { type: 'OPTION'; optionIds: string[] }
  | { type: 'INTEGER' | 'REAL'; min?: number; max?: number }
  | { type: 'DATE'; from?: string; to?: string };

// The UI-side filter state (URL-backed). Empty/undefined members are simply not
// applied. `lens` replaces the default visible-or-on-hand population.
// `null` members are allowed because FilterBar marks an added-but-empty chip
// with null; buildItemFilter treats null and undefined identically (not
// applied).
export type ItemsListFilter = {
  codeOrName?: string | null;
  lens?: StockStatusLens | null;
  minMonthsOfStock?: number | null;
  maxMonthsOfStock?: number | null;
  masterListId?: string | null;
  atRisk?: AtRisk | null;
  customFields?: Record<string, CustomFieldFilterValue> | null;
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

// A custom-field filter value → the dynamicFilter condition-AST node for it
// (spec/items contract "custom fields"). Number/date ranges expand to TWO nodes
// (>= min, <= max); everything else is one. Returns [] when the value carries
// no bound (so it contributes nothing).
export const customFieldConditions = (
  key: string,
  v: CustomFieldFilterValue
): unknown[] => {
  const cf = (filter: unknown) => ({ CustomField: { key, filter } });
  switch (v.type) {
    case 'TEXT':
      return v.contains ? [cf({ Text: { Like: v.contains } })] : [];
    case 'BOOLEAN':
      return [cf({ Boolean: { Equal: v.value } })];
    case 'OPTION':
      // parent matches descendants: send the parent id plus every descendant id
      return v.optionIds.length ? [cf({ Option: { In: v.optionIds } })] : [];
    case 'INTEGER':
    case 'REAL': {
      const out: unknown[] = [];
      if (v.min !== undefined)
        out.push(cf({ Number: { GreaterThanOrEqual: v.min } }));
      if (v.max !== undefined)
        out.push(cf({ Number: { LowerThanOrEqual: v.max } }));
      return out;
    }
    case 'DATE': {
      const out: unknown[] = [];
      if (v.from) out.push(cf({ Date: { GreaterThanOrEqual: v.from } }));
      if (v.to) out.push(cf({ Date: { LowerThanOrEqual: v.to } }));
      return out;
    }
  }
};

// All custom-field values → the dynamicFilter JSON (an { And: [...] } of
// CustomField nodes), or undefined when nothing is set. Several property
// filters combine as AND with each other and everything else (AC-P2).
export const buildDynamicFilter = (
  customFields: Record<string, CustomFieldFilterValue> | null | undefined
): unknown | undefined => {
  if (!customFields) return undefined;
  const conditions = Object.entries(customFields).flatMap(([key, v]) =>
    customFieldConditions(key, v)
  );
  return conditions.length ? { And: conditions } : undefined;
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

  const dynamicFilter = buildDynamicFilter(f.customFields);
  if (dynamicFilter !== undefined) filter.dynamicFilter = dynamicFilter;

  return filter;
};
