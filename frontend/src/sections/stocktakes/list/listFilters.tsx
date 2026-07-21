import { t } from '../../../intl';
import {
  FilterSelect,
  FilterTextInput,
  FilterNumberInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { DateRangeField } from '../../../ui/elements/inputs/DateRangeField';
import { utcToLocalParts } from '../../../ui/elements/inputs/dateTimeConvert';
import type { StocktakesVariables } from './stocktakes.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping — this is the generated variables' filter shape). It flows straight
// through the FilterBar; there is no parallel value model and no mapper.
export type StocktakeFilter = NonNullable<StocktakesVariables['filter']>;

// A picked calendar day widened to an inclusive instant in the viewer's local
// zone — start-of-day for the lower bound, end-of-day for the upper — because
// the `createdDatetime` field is a `DateTime`, not a plain calendar date, so a
// bare `YYYY-MM-DD` is not a valid value for it (mirrors the reports
// DateRange widening in json-forms/schema.ts `toDatetimeFilter`). `stocktakeDate`
// needs none of this: it is a `NaiveDate`, so the picked dates pass through as-is.
const dayStart = (iso: string) => new Date(`${iso}T00:00:00`).toISOString();
const dayEnd = (iso: string) => new Date(`${iso}T23:59:59.999`).toISOString();

// The inverse read-back for the Created chip: recover the LOCAL calendar day
// the user picked from the stored UTC instant. A naive `.slice(0, 10)` reads the
// UTC day, which is off by one for any device behind/ahead of UTC once the
// widened start-of-day instant crosses the date line (e.g. NZ, UTC+12: local
// 2026-07-15T00:00 is stored as 2026-07-14T12:00Z, and slicing gives the wrong
// 14th). utcToLocalParts converts back with the same device-tz getters the
// widening used, so pick → store → display round-trips to the same day.
const localDay = (utc: string | null | undefined) =>
  utcToLocalParts(utc)?.date ?? null;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the stocktakes list (the
 * spec's deliberate-filters requirement, preserved from the reference
 * vertical). The map passed to `constructFilters` is keyed by EVERY key of the
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
  description: {
    label: () => t('label.description'),
    render: props => (
      <FilterTextInput
        label={t('label.description')}
        testId={props.testId}
        placeholder={t('label.description')}
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
    label: () => t('label.comment'),
    render: props => (
      <FilterTextInput
        label={t('label.comment')}
        testId={props.testId}
        placeholder={t('label.comment')}
        value={props.filter().comment?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ comment: value ? { like: value } : null })
        }
      />
    ),
  },
  isLocked: {
    label: () => t('label.locked'),
    render: props => (
      <FilterSelect
        label={t('label.locked')}
        testId={props.testId}
        value={
          props.filter().isLocked == null
            ? ''
            : props.filter().isLocked
              ? 'true'
              : 'false'
        }
        options={[
          { value: '', label: t('label.any') },
          { value: 'true', label: t('messages.yes') },
          { value: 'false', label: t('messages.no') },
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
    label: () => t('label.number'),
    render: props => (
      <FilterNumberInput
        label={t('label.number')}
        testId={props.testId}
        placeholder={t('label.number')}
        // stocktakeNumber is an integer — NumberField edits (and commits) a real
        // number, so no string parsing / NaN guard here. `?? undefined` keeps
        // the box blank when unset.
        value={props.filter().stocktakeNumber?.equalTo ?? undefined}
        // Server honours stocktakeNumber.equalTo (verified). A committed number
        // → { equalTo }; clearing the box (undefined) → null so the chip stays
        // with no filter applied (never { equalTo: NaN }).
        onChange={value =>
          props.setPartialFilter({
            stocktakeNumber: value === undefined ? null : { equalTo: value },
          })
        }
      />
    ),
  },

  // Stocktake date — a `DateFilterInput` over the `NaiveDate` field: the picked
  // calendar dates go straight onto afterOrEqualTo/beforeOrEqualTo unchanged
  // (no timezone widening — the field has no time). Both ends empty → null so
  // the chip stays (present-as-null) with no filter applied; stripEmpty drops
  // it before the query. A one-sided range keeps just the bound that is set.
  stocktakeDate: {
    label: () => t('label.stocktake-date'),
    render: props => (
      <DateRangeField
        label={t('label.stocktake-date')}
        hideLabel
        size="small"
        testId={props.testId}
        value={{
          start: props.filter().stocktakeDate?.afterOrEqualTo ?? null,
          end: props.filter().stocktakeDate?.beforeOrEqualTo ?? null,
        }}
        onChange={({ start, end }) =>
          props.setPartialFilter({
            stocktakeDate:
              start || end
                ? {
                    ...(start ? { afterOrEqualTo: start } : {}),
                    ...(end ? { beforeOrEqualTo: end } : {}),
                  }
                : null,
          })
        }
      />
    ),
  },
  // Created — a `DatetimeFilterInput` over the `DateTime` field: a picked day is
  // widened to an inclusive instant (day-start … day-end) in the viewer's local
  // zone, because a bare calendar date is not a valid DateTime. Same
  // empty/one-sided handling as above. The value the field shows is recovered
  // from the stored UTC instant back to the LOCAL day (localDay, not a bare
  // slice — see its note) so pick → store → display round-trips to the same day.
  createdDatetime: {
    label: () => t('label.created'),
    render: props => (
      <DateRangeField
        label={t('label.created')}
        hideLabel
        size="small"
        testId={props.testId}
        value={{
          start: localDay(props.filter().createdDatetime?.afterOrEqualTo),
          end: localDay(props.filter().createdDatetime?.beforeOrEqualTo),
        }}
        onChange={({ start, end }) =>
          props.setPartialFilter({
            createdDatetime:
              start || end
                ? {
                    ...(start ? { afterOrEqualTo: dayStart(start) } : {}),
                    ...(end ? { beforeOrEqualTo: dayEnd(end) } : {}),
                  }
                : null,
          })
        }
      />
    ),
  },

  // ─ dismissed (not user-facing)
  // ───────────────────────────────────────────────
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
