import { t } from '../../../intl';
import {
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { LocationSelect, type Location } from '../../../domain/location';
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
// only filters we can offer are the ones the backend supports. `itemCodeOrName`
// is the always-on item search rendered by the toolbar (not a chip), so it's
// dismissed here; `locationId` is the one addable chip (exact-match location
// picker). The filters the OLD client-side filter offered but the server can't
// do yet — batch (no field), expiry-before (no field), and the "show error
// lines" filter — are TODOs below.
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
    locationId: {
      label: () => t('label.location'),
      render: props => (
        <LocationSelect
          label={t('label.location')}
          hideLabel
          locations={locations()}
          value={props.filter().locationId?.equalTo ?? undefined}
          placeholder={t('label.location')}
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
    // The always-on item search (name OR code) — rendered by the toolbar, not
    // as a chip.
    itemCodeOrName: null,
    // TODO: batch filter. The old client filter offered it, but
    // StocktakeLineFilterInput has no `batch` field — needs a backend addition.
    // TODO: expiry-before filter. No expiry field on the server filter — needs a
    // backend addition.
    // TODO: "show error lines" filter. The error dialog used to switch a
    // client-only id set; server-side this would be `id.equalAny` (or
    // stockLineId) with the failed ids. Errors still flag inline on the row.
    id: null,
    stocktakeId: null,
    itemId: null,
    stockLineId: null,
  });
