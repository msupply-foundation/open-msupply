import { t } from '@/intl';
import {
  FilterSelect,
  FilterDateRange,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { StocktakesVariables } from './stocktakes.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping — this is the generated variables' filter shape). It flows straight
// through the FilterBar; there is no parallel value model and no mapper.
export type StocktakeFilter = NonNullable<StocktakesVariables['filter']>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the stocktakes list. The list
 * surfaces only Status + Created (aligned to the real client — see the
 * dismissed section below). The map passed to `constructFilters` is keyed by
 * EVERY key of the
 * generated StocktakeFilterInput: a key maps to a definition to expose it, or
 * `null` to dismiss it (not user-facing). Being a Record over all of
 * `StocktakeFilter`, it can't compile with a key missing — when the schema
 * gains a filter, codegen adds the key and this map stops compiling until we
 * decide expose-or-dismiss. Nothing is exposed by accident, and this single
 * map is BOTH the definitions and the completeness proof (no parallel switch,
 * no separate ordered list — the map's key order IS the toolbar's display
 * order, so exposed filters come first).
 *
 * Each exposed field renders its own control (kdd/explicit-composition — the
 * mapping is visible right here, not hidden behind a config seam): it reads
 * its one key out of the filter for the control's value and writes it back via
 * setPartialFilter in the GraphQL-native operator shape ({ like }, { equalTo
 * }, a boolean). An empty choice writes `null` (FilterBar's "added but empty"
 * marker); stripEmpty (typeHelpers) drops those before the filter reaches the
 * server. The owning key is supplied by the map position, so each def omits
 * `key`. Adding a control type (a date range for stocktakeDate) is just a
 * different component in that key's render — no change to FilterBar.
 *
 * Built once, at module load — a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit (kdd/state-management: no remounts). Safe
 * despite the t()-driven labels because each `label` is an ACCESSOR (() =>
 * t(...)) read in FilterBar's JSX, so the array needn't be rebuilt to
 * re-translate on a language switch; labels update in place (render likewise
 * calls t() lazily at render).
 */
const FILTERS: Filter<StocktakeFilter>[] = constructFilters<StocktakeFilter>({
  // ─ user-facing, in display order
  // ─────────────────────────────────────────────
  status: {
    label: () => t('label.status'),
    render: props => (
      <FilterSelect
        label={t('label.status')}
        testId={props.testId}
        value={props.filter().status?.equalTo ?? ''}
        options={[
          { value: '', label: t('label.any') },
          { value: 'NEW', label: t('status.new') },
          { value: 'FINALISED', label: t('status.finalised') },
        ]}
        // The server honours status.equalTo, NOT equalAny (equalAny is in the
        // schema input but the resolver ignores it). '' clears (→ null so the
        // chip stays); otherwise value is one of the enum literals, so no cast
        // is needed.
        onChange={value =>
          props.setPartialFilter({ status: value ? { equalTo: value } : null })
        }
      />
    ),
  },
  // Created — DateTime field; FilterDateRange (type="dateTime") owns the
  // local ⇄ UTC conversion (#456). (`stocktakeDate` is a `NaiveDate`.)
  createdDatetime: {
    label: () => t('label.created'),
    render: props => (
      <FilterDateRange
        type="dateTime"
        label={t('label.created')}
        testId={props.testId}
        value={props.filter().createdDatetime}
        onChange={value => props.setPartialFilter({ createdDatetime: value })}
      />
    ),
  },

  // ─ dismissed (not user-facing)
  // ───────────────────────────────────────────────
  // Aligned to the real client (Stocktake/ListView): its list surfaces ONLY
  // Status + Created, so Description / Comment / Locked / Number / Stocktake-date
  // are dismissed here even though the schema declares them (they stay
  // contract-declared and could be re-surfaced — see spec/stocktakes README's
  // "List filter set aligned to the real client"). The fields remain filterable
  // on the wire; we simply don't offer a control.
  description: null,
  comment: null,
  isLocked: null,
  stocktakeNumber: null,
  stocktakeDate: null,
  // Program stocktake — a boolean the schema exposes, but not surfaced as a
  // list filter for now (dismissed by product decision).
  isProgramStocktake: null,
  // Identity / relational / datetime filters — programmatic, not user-facing
  // list filters.
  id: null,
  userId: null,
  programId: null,
  finalisedDatetime: null,
});

export const filterFields = (): Filter<StocktakeFilter>[] => FILTERS;
