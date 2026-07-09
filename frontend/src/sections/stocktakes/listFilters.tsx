import { exhaustiveCheck } from '../../typeHelpers';
import { t } from '../../intl';
import { FilterSelect, FilterTextInput, type Filter } from '../../ui/elements/selectors/FilterBar';
import type { StocktakesVariables } from './stocktakes.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no remapping —
// this is the generated variables' filter shape). It flows straight through the
// FilterBar; there is no parallel value model and no mapper.
export type StocktakeFilter = NonNullable<StocktakesVariables['filter']>;
type FilterKey = keyof StocktakeFilter;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the stocktakes list (the spec's
 * deliberate-filters requirement, preserved from the reference vertical). `fieldFor`
 * is a switch over every key of the generated StocktakeFilterInput with no default
 * arm — exhaustiveCheck forces it to be total. When the schema gains a filter, codegen
 * adds the key, this switch stops compiling, and we must decide: expose it (return a
 * Filter) or dismiss it (return null). Nothing is exposed by accident.
 *
 * Each exposed field renders its own control (kdd/explicit-composition — the mapping
 * is visible right here, not hidden behind a config seam): it reads its one key out of
 * the filter for the control's value and writes it back via setPartialFilter in the
 * GraphQL-native operator shape ({ like }, { equalTo }, a boolean). An empty choice
 * writes `null` (FilterBar's "added but empty" marker); stripEmpty (typeHelpers) drops
 * those before the filter reaches the server. Adding a control type (a date range for
 * stocktakeDate) is just a different component in render — no change to FilterBar.
 */
const fieldFor = (key: FilterKey): Filter<StocktakeFilter> | null => {
  switch (key) {
    case 'status':
      return {
        key,
        label: () => t('stocktake.filter.status'),
        render: ({ filter, setPartialFilter }) => (
          <FilterSelect
            label={t('stocktake.filter.status')}
            value={filter().status?.equalTo ?? ''}
            options={[
              { value: '', label: t('filter.any') },
              { value: 'NEW', label: t('stocktake.status.new') },
              { value: 'FINALISED', label: t('stocktake.status.finalised') },
            ]}
            // The server honours status.equalTo, NOT equalAny (equalAny is in the
            // schema input but the resolver ignores it). '' clears (→ null so the chip stays);
            // otherwise value is one of the enum literals, so no cast is needed.
            onChange={value => setPartialFilter({ status: value ? { equalTo: value } : null })}
          />
        ),
      };
    case 'description':
      return {
        key,
        label: () => t('stocktake.filter.description'),
        render: ({ filter, setPartialFilter }) => (
          <FilterTextInput
            label={t('stocktake.filter.description')}
            placeholder={t('stocktake.filter.contains')}
            value={filter().description?.like ?? ''}
            // Blank box → null, never { like: '' }: an empty `like` would wrongly
            // match (the server treats "" as a real substring).
            onInput={value => setPartialFilter({ description: value ? { like: value } : null })}
          />
        ),
      };
    case 'comment':
      return {
        key,
        label: () => t('stocktake.filter.comment'),
        render: ({ filter, setPartialFilter }) => (
          <FilterTextInput
            label={t('stocktake.filter.comment')}
            placeholder={t('stocktake.filter.contains')}
            value={filter().comment?.like ?? ''}
            onInput={value => setPartialFilter({ comment: value ? { like: value } : null })}
          />
        ),
      };
    case 'isLocked':
      return {
        key,
        label: () => t('stocktake.filter.locked'),
        render: ({ filter, setPartialFilter }) => (
          <FilterSelect
            label={t('stocktake.filter.locked')}
            value={filter().isLocked == null ? '' : filter().isLocked ? 'true' : 'false'}
            options={[
              { value: '', label: t('filter.any') },
              { value: 'true', label: t('common.yes') },
              { value: 'false', label: t('common.no') },
            ]}
            onChange={value => setPartialFilter({ isLocked: value === '' ? null : value === 'true' })}
          />
        ),
      };
    case 'isProgramStocktake':
      return {
        key,
        label: () => t('stocktake.filter.program'),
        render: ({ filter, setPartialFilter }) => (
          <FilterSelect
            label={t('stocktake.filter.program')}
            value={filter().isProgramStocktake == null ? '' : filter().isProgramStocktake ? 'true' : 'false'}
            options={[
              { value: '', label: t('filter.any') },
              { value: 'true', label: t('common.yes') },
              { value: 'false', label: t('common.no') },
            ]}
            onChange={value =>
              setPartialFilter({ isProgramStocktake: value === '' ? null : value === 'true' })
            }
          />
        ),
      };

    // Date-range filter — now trivially expressible (render a date-range control),
    // but the styled control is not built yet, so it stays deferred; listed here so
    // the switch stays exhaustive and the decision is on record.
    case 'stocktakeDate':
    // Identity / relational filters — programmatic, not user-facing list filters.
    case 'id':
    case 'userId':
    case 'programId':
    case 'stocktakeNumber':
    case 'createdDatetime':
    case 'finalisedDatetime':
      return null;
  }
  // A new key on StocktakeFilterInput makes `key` non-never here and this stops
  // compiling — forcing a deliberate decision above.
  return exhaustiveCheck(key);
};

// User-facing filters, in display order (explicit so the toolbar reads deliberately).
const FIELD_ORDER: FilterKey[] = [
  'status',
  'description',
  'comment',
  'isLocked',
  'isProgramStocktake',
];

// Built once, at module load — a stable const, so FilterBar's <For> never remounts a
// chip on a filter edit (kdd/state-management: no remounts). This is safe despite the
// t()-driven labels because each field's `label` is an ACCESSOR (() => t(...)), read
// in FilterBar's JSX — so the array needn't be rebuilt to re-translate on a language
// switch; the labels update in place. (render likewise calls t() lazily at render.)
const FILTERS: Filter<StocktakeFilter>[] = FIELD_ORDER.map(fieldFor).filter(
  (f): f is Filter<StocktakeFilter> => f !== null,
);

export const filterFields = (): Filter<StocktakeFilter>[] => FILTERS;
