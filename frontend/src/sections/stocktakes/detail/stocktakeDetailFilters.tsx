import { t } from '../../../intl';
import {
  constructFilters,
  FilterDate,
  FilterTextInput,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import type { StocktakeLineFilter } from './stocktakeLineFilter';

// The detail-view filter chips, built once via constructFilters over the
// client-side StocktakeLineFilter. `search` is NOT here — it's the always-on
// item search rendered separately (like OMS), so it's dismissed as `null`.
// `errorIds` IS a real chip (a removable "Error lines" filter), but it's only
// OFFERED when the stocktake has errors — see stocktakeDetailFilters() below,
// which drops it from the list otherwise. It's a label-only chip (no editable
// control): the error dialog activates it with the actual error line ids; the
// user can then remove it to go back to all rows.
//
// Each chip's control reads its key off filter() and writes it back with
// setPartialFilter, in the filter-native shape (kdd/type-safety). label is an
// accessor so it re-translates on locale switch while the array identity stays
// stable (no chip remounts — kdd/state-management).
const FILTERS = constructFilters<StocktakeLineFilter>({
  search: null,
  errorIds: {
    label: () => t('heading.stocktake-errors'),
    // Label-only chip — activated by the error dialog with the actual line
    // ids, removed by its X.
    render: () => null,
  },
  item: {
    label: () => t('label.item'),
    render: props => (
      <FilterTextInput
        label={t('label.item')}
        placeholder={t('label.item')}
        value={props.filter().item ?? ''}
        onInput={value => props.setPartialFilter({ item: value })}
      />
    ),
  },
  batch: {
    label: () => t('label.batch'),
    render: props => (
      <FilterTextInput
        label={t('label.batch')}
        placeholder={t('label.batch')}
        value={props.filter().batch ?? ''}
        onInput={value => props.setPartialFilter({ batch: value })}
      />
    ),
  },
  location: {
    label: () => t('label.location'),
    render: props => (
      <FilterTextInput
        label={t('label.location')}
        placeholder={t('label.location')}
        value={props.filter().location ?? ''}
        onInput={value => props.setPartialFilter({ location: value })}
      />
    ),
  },
  expiryBefore: {
    label: () => t('label.items-expiring-before'),
    render: props => (
      <FilterDate
        label={t('label.items-expiring-before')}
        value={props.filter().expiryBefore ?? ''}
        onInput={value => props.setPartialFilter({ expiryBefore: value })}
      />
    ),
  },
});

// The addable/removable filters. The errors chip is offered ONLY when the
// stocktake has error lines — otherwise it's dropped, so it can't be added from
// the menu when there's nothing to filter to. Everything else is always
// available. (Stable identities: the same def objects are filtered, never
// rebuilt, so <For> reuses chip rows — no remounts.)
export const stocktakeDetailFilters = (
  hasErrors: boolean
): Filter<StocktakeLineFilter>[] =>
  hasErrors ? FILTERS : FILTERS.filter(f => f.key !== 'errorIds');
