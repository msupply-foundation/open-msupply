import { t } from '../../../intl';
import {
  FilterSelect,
  FilterNumberInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import type { ItemsListFilter } from './itemFilter';

export type MasterListOption = { id: string; name: string };

// The list's add-a-filter chip menu (spec/items S1 › Filters). The
// always-present code-or-name SEARCH is rendered separately in the Toolbar (not
// a chip), so `codeOrName` is dismissed here. Per-definition custom-field
// filters ride the shared domain/customFields group (FilterBar `extra`), a
// separate state slice — not part of this ItemsListFilter map.
//
// `masterLists` / `showAtRisk` are accessors: the master-list options stay
// fresh without rebuilding the array, and the two conditional chips
// (master-list — only when the store has lists; at-risk — only when the
// recent-consumption window preference is set) are filtered out.
export const buildItemsFilters = (
  masterLists: () => MasterListOption[],
  showAtRisk: () => boolean
): Filter<ItemsListFilter>[] => {
  const all = constructFilters<ItemsListFilter>({
    lens: {
      label: () => t('label.in-stock'),
      render: props => (
        <FilterSelect
          label={t('label.in-stock')}
          testId={props.testId}
          value={props.filter().lens ?? ''}
          options={[
            { value: '', label: t('label.any') },
            { value: 'in-stock', label: t('label.in-stock') },
            {
              value: 'in-stock-recent',
              label: t('label.in-stock-with-recent-consumption'),
            },
            { value: 'out-of-stock', label: t('label.out-of-stock') },
            {
              value: 'out-of-stock-recent',
              label: t('label.out-of-stock-with-recent-consumption'),
            },
          ]}
          onChange={value => props.setPartialFilter({ lens: value || null })}
        />
      ),
    },
    minMonthsOfStock: {
      label: () => t('label.min-mos'),
      render: props => (
        <FilterNumberInput
          label={t('label.min-mos')}
          testId={props.testId}
          value={props.filter().minMonthsOfStock ?? undefined}
          onChange={value =>
            props.setPartialFilter({ minMonthsOfStock: value ?? null })
          }
        />
      ),
    },
    maxMonthsOfStock: {
      label: () => t('label.max-mos'),
      render: props => (
        <FilterNumberInput
          label={t('label.max-mos')}
          testId={props.testId}
          value={props.filter().maxMonthsOfStock ?? undefined}
          onChange={value =>
            props.setPartialFilter({ maxMonthsOfStock: value ?? null })
          }
        />
      ),
    },
    masterListId: {
      label: () => t('label.master-list'),
      render: props => (
        <FilterSelect
          label={t('label.master-list')}
          testId={props.testId}
          value={props.filter().masterListId ?? ''}
          options={[
            { value: '', label: t('label.any') },
            ...masterLists().map(m => ({ value: m.id, label: m.name })),
          ]}
          onChange={value =>
            props.setPartialFilter({ masterListId: value || null })
          }
        />
      ),
    },
    atRisk: {
      label: () => t('label.products-at-risk-of-being-out-of-stock'),
      render: props => (
        <FilterSelect
          label={t('label.products-at-risk-of-being-out-of-stock')}
          testId={props.testId}
          value={props.filter().atRisk ?? ''}
          options={[
            { value: '', label: t('label.any') },
            { value: 'at-risk', label: t('label.show-products-at-risk') },
            {
              value: 'not-at-risk',
              label: t('label.show-products-not-at-risk'),
            },
          ]}
          onChange={value => props.setPartialFilter({ atRisk: value || null })}
        />
      ),
    },
    codeOrName: null,
  });

  return all.filter(f => {
    if (f.key === 'masterListId') return masterLists().length > 0;
    if (f.key === 'atRisk') return showAtRisk();
    return true;
  });
};
