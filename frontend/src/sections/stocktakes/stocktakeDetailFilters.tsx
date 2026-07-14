import { t } from '../../intl';
import {
  constructFilters,
  FilterDate,
  FilterTextInput,
  type Filter,
} from '../../ui/elements/selectors/FilterBar';
import type { StocktakeLineFilter } from './stocktakeLineFilter';

// The detail-view filter chips, built once via constructFilters over the client-side
// StocktakeLineFilter. `search` is NOT here — it's the always-on item search rendered separately
// (like OMS), so it's dismissed as `null`. `errorIds` IS a real chip (a removable "Error lines"
// filter), but it's only OFFERED when the stocktake has errors — see stocktakeDetailFilters()
// below, which drops it from the list otherwise. It's a label-only chip (no editable control):
// the error dialog activates it with the actual error line ids; the user can then remove it to go
// back to all rows.
//
// Each chip's control reads its key off filter() and writes it back with setPartialFilter, in the
// filter-native shape (kdd/type-safety). label is an accessor so it re-translates on locale
// switch while the array identity stays stable (no chip remounts — kdd/state-management).
const FILTERS = constructFilters<StocktakeLineFilter>({
  search: null,
  errorIds: {
    label: () => t('stocktake.errors.filter-label'),
    // Label-only chip — activated by the error dialog with the actual line ids, removed by its X.
    render: () => null,
  },
  item: {
    label: () => t('stocktake.detail-filter.item'),
    render: ({ filter, setPartialFilter }) => (
      <FilterTextInput
        label={t('stocktake.detail-filter.item')}
        placeholder={t('stocktake.filter.contains')}
        value={filter().item ?? ''}
        onInput={(value) => setPartialFilter({ item: value })}
      />
    ),
  },
  batch: {
    label: () => t('stocktake.detail-filter.batch'),
    render: ({ filter, setPartialFilter }) => (
      <FilterTextInput
        label={t('stocktake.detail-filter.batch')}
        placeholder={t('stocktake.filter.contains')}
        value={filter().batch ?? ''}
        onInput={(value) => setPartialFilter({ batch: value })}
      />
    ),
  },
  location: {
    label: () => t('stocktake.detail-filter.location'),
    render: ({ filter, setPartialFilter }) => (
      <FilterTextInput
        label={t('stocktake.detail-filter.location')}
        placeholder={t('stocktake.filter.contains')}
        value={filter().location ?? ''}
        onInput={(value) => setPartialFilter({ location: value })}
      />
    ),
  },
  expiryBefore: {
    label: () => t('stocktake.detail-filter.expiry'),
    render: ({ filter, setPartialFilter }) => (
      <FilterDate
        label={t('stocktake.detail-filter.expiry')}
        value={filter().expiryBefore ?? ''}
        onInput={(value) => setPartialFilter({ expiryBefore: value })}
      />
    ),
  },
});

// The addable/removable filters. The errors chip is offered ONLY when the stocktake has error
// lines — otherwise it's dropped, so it can't be added from the menu when there's nothing to
// filter to. Everything else is always available. (Stable identities: the same def objects are
// filtered, never rebuilt, so <For> reuses chip rows — no remounts.)
export const stocktakeDetailFilters = (hasErrors: boolean): Filter<StocktakeLineFilter>[] =>
  hasErrors ? FILTERS : FILTERS.filter((f) => f.key !== 'errorIds');
