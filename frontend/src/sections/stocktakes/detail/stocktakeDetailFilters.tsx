import { t } from '@/intl';
import {
  FilterCombobox,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { type Location } from '@/domain/location';
import type { StocktakeLineFilter } from './stocktakeLineFilter';

// Type-driven, EXHAUSTIVE filter definitions for the stocktake detail lines,
// mirroring the stocktakes LIST (listFilters.tsx). The map passed to
// constructFilters is keyed by EVERY key of the generated
// StocktakeLineFilterInput: a key maps to a definition to expose it, or `null`
// to dismiss it. Being a Record over all of StocktakeLineFilter it can't
// compile with a key missing — when the schema gains a filter, codegen adds the
// key and this map stops compiling until we decide expose-or-dismiss.
//
// The detail table is server-filtered now (kdd/stocktake-line-editing), so the
// only filters we can offer are the ones the backend supports: `itemCodeOrName`
// (the item name/code search) and `locationId` (an exact-match location
// picker), both addable chips in the table toolbar's FilterBar — the same
// filter-chip model as the list. The
// filters the OLD client-side filter offered but the server can't do yet —
// batch (no field), expiry-before (no field) — are TODOs below. The "show
// error lines" filter IS built, but it doesn't belong here: it's a boolean
// toggle over the view's transient error id-set, not a wire-filter key the
// user types into, so it rides FilterBar's `extra` group in
// StocktakeLineFilters.tsx (resolved to `id.equalAny` at query time).
// The location filter uses the plain, VOLUME-BLIND picker: it only narrows the
// line list to a location, so capacity is irrelevant (spec/stocktakes/
// ui-surface.md). The locations are fetched by the detail VIEW (one fetch,
// shared with the volume-aware editor pickers) and threaded through here as an
// accessor so the chip's render reads the live list without owning a cache.
export const stocktakeDetailFilters = (
  locations: () => Location[]
): Filter<StocktakeLineFilter>[] =>
  constructFilters<StocktakeLineFilter>({
    // ─ user-facing (addable chips), in display order ─────────────────────────
    // Item name / code search (server itemCodeOrName.like). Blank clears to
    // null so stripEmpty drops it (a blank `like` would match everything).
    //
    // Labelled for what it MATCHES rather than one of the two fields: the
    // label the current app uses here and spec/items/ui-surface.md records for
    // the items list's search.
    itemCodeOrName: {
      label: () => t('label.code-or-name'),
      render: props => (
        <FilterTextInput
          label={t('label.code-or-name')}
          placeholder={t('placeholder.search')}
          testId={props.testId}
          value={props.filter().itemCodeOrName?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              itemCodeOrName: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    locationId: {
      label: () => t('label.location'),
      render: props => (
        <FilterCombobox
          label={t('label.location')}
          items={locations()}
          itemToString={l => `${l.code} — ${l.name}`}
          itemToValue={l => l.id}
          testId={props.testId}
          focusTarget={props.focusTarget}
          value={props.filter().locationId?.equalTo ?? undefined}
          placeholder={t('placeholder.search')}
          // Pick a location → filter by its id (server locationId.equalTo);
          // clear (×) → null so stripEmpty drops it (the chip stays).
          onChange={location =>
            props.setPartialFilter({
              locationId: location ? { equalTo: location.id } : null,
            })
          }
        />
      ),
    },

    // ─ dismissed (not addable chips) ─────────────────────────────────────────
    // TODO: batch filter. The old client filter offered it, but
    // StocktakeLineFilterInput has no `batch` field — needs a backend addition.
    // TODO: expiry-before filter. No expiry field on the server filter — needs
    // a backend addition.
    // `id` is dismissed HERE (it's not a user-typed chip), but it IS used by
    // the "show error lines" filter — driven from the view's error id-set as
    // `id.equalAny`, wired through FilterBar's `extra` group in
    // StocktakeLineFilters.tsx, not this wire-filter map.
    id: null,
    stocktakeId: null,
    itemId: null,
    stockLineId: null,
  });
