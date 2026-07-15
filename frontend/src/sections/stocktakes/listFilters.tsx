import { t } from '../../intl';
import {
  FilterSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../ui/elements/selectors/FilterBar';
import type { StocktakesVariables } from './stocktakes.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no remapping —
// this is the generated variables' filter shape). It flows straight through the
// FilterBar; there is no parallel value model and no mapper.
export type StocktakeFilter = NonNullable<StocktakesVariables['filter']>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the stocktakes list (the spec's
 * deliberate-filters requirement, preserved from the reference vertical). The map passed
 * to `constructFilters` is keyed by EVERY key of the generated StocktakeFilterInput: a
 * key maps to a definition to expose it, or `null` to dismiss it (not user-facing). Being
 * a Record over all of `StocktakeFilter`, it can't compile with a key missing — when the
 * schema gains a filter, codegen adds the key and this map stops compiling until we decide
 * expose-or-dismiss. Nothing is exposed by accident, and this single map is BOTH the
 * definitions and the completeness proof (no parallel switch, no separate ordered list —
 * the map's key order IS the toolbar's display order, so exposed filters come first).
 *
 * Each exposed field renders its own control (kdd/explicit-composition — the mapping is
 * visible right here, not hidden behind a config seam): it reads its one key out of the
 * filter for the control's value and writes it back via setPartialFilter in the
 * GraphQL-native operator shape ({ like }, { equalTo }, a boolean). An empty choice writes
 * `null` (FilterBar's "added but empty" marker); stripEmpty (typeHelpers) drops those
 * before the filter reaches the server. The owning key is supplied by the map position,
 * so each def omits `key`. Adding a control type (a date range for stocktakeDate) is just
 * a different component in that key's render — no change to FilterBar.
 *
 * Built once, at module load — a stable const, so FilterBar's <For> never remounts a chip
 * on a filter edit (kdd/state-management: no remounts). Safe despite the t()-driven labels
 * because each `label` is an ACCESSOR (() => t(...)) read in FilterBar's JSX, so the array
 * needn't be rebuilt to re-translate on a language switch; labels update in place (render
 * likewise calls t() lazily at render).
 */
const FILTERS: Filter<StocktakeFilter>[] = constructFilters<StocktakeFilter>({
  // ─ user-facing, in display order ─────────────────────────────────────────────
  status: {
    label: () => t('stocktake.filter.status'),
    render: props => (
      <FilterSelect
        label={t('stocktake.filter.status')}
        value={props.filter().status?.equalTo ?? ''}
        options={[
          { value: '', label: t('filter.any') },
          { value: 'NEW', label: t('stocktake.status.new') },
          { value: 'FINALISED', label: t('stocktake.status.finalised') },
        ]}
        // The server honours status.equalTo, NOT equalAny (equalAny is in the
        // schema input but the resolver ignores it). '' clears (→ null so the chip stays);
        // otherwise value is one of the enum literals, so no cast is needed.
        onChange={value =>
          props.setPartialFilter({ status: value ? { equalTo: value } : null })
        }
      />
    ),
  },
  description: {
    label: () => t('stocktake.filter.description'),
    render: props => (
      <FilterTextInput
        label={t('stocktake.filter.description')}
        placeholder={t('stocktake.filter.contains')}
        value={props.filter().description?.like ?? ''}
        // Blank box → null, never { like: '' }: an empty `like` would wrongly
        // match (the server treats "" as a real substring).
        onInput={value =>
          props.setPartialFilter({
            description: value ? { like: value } : null,
          })
        }
      />
    ),
  },
  comment: {
    label: () => t('stocktake.filter.comment'),
    render: props => (
      <FilterTextInput
        label={t('stocktake.filter.comment')}
        placeholder={t('stocktake.filter.contains')}
        value={props.filter().comment?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ comment: value ? { like: value } : null })
        }
      />
    ),
  },
  isLocked: {
    label: () => t('stocktake.filter.locked'),
    render: props => (
      <FilterSelect
        label={t('stocktake.filter.locked')}
        value={
          props.filter().isLocked == null
            ? ''
            : props.filter().isLocked
              ? 'true'
              : 'false'
        }
        options={[
          { value: '', label: t('filter.any') },
          { value: 'true', label: t('common.yes') },
          { value: 'false', label: t('common.no') },
        ]}
        onChange={value =>
          props.setPartialFilter({
            isLocked: value === '' ? null : value === 'true',
          })
        }
      />
    ),
  },
  stocktakeNumber: {
    label: () => t('stocktake.filter.number'),
    render: props => (
      <FilterTextInput
        label={t('stocktake.filter.number')}
        placeholder={t('stocktake.filter.equals')}
        // stocktakeNumber is an integer; the control edits a string. Show it as text,
        // and parse on input below. `?? ''` keeps the box blank when unset.
        value={props.filter().stocktakeNumber?.equalTo?.toString() ?? ''}
        // Server honours stocktakeNumber.equalTo (verified). Parse the string to an int;
        // a blank or non-numeric box clears to null (chip stays, no filter applied) —
        // never { equalTo: NaN }, which would serialise to null and silently mismatch.
        onInput={value => {
          const n = Number.parseInt(value, 10);
          props.setPartialFilter({
            stocktakeNumber: Number.isNaN(n) ? null : { equalTo: n },
          });
        }}
      />
    ),
  },

  // ─ dismissed (not user-facing) ───────────────────────────────────────────────
  // Date-range filter — trivially expressible (render a date-range control), but the
  // styled control is not built yet, so it stays deferred; the decision is on record here.
  stocktakeDate: null,
  // Program stocktake — a boolean the schema exposes, but not surfaced as a list filter
  // for now (dismissed by product decision).
  isProgramStocktake: null,
  // Identity / relational / datetime filters — programmatic, not user-facing list filters.
  id: null,
  userId: null,
  programId: null,
  createdDatetime: null,
  finalisedDatetime: null,
});

export const filterFields = (): Filter<StocktakeFilter>[] => FILTERS;
