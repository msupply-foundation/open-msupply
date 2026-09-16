import { t } from '@/intl';
import {
  FilterDateRange,
  FilterMultiSelect,
  FilterNumberInput,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { STATUS_LABELS } from '../detail/stockMovementStatus';
import type { StockMovementsVariables } from './stockMovements.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping) — the generated StockRelocationFilterInput shape flows straight
// through the FilterBar.
export type StockMovementFilter = NonNullable<
  StockMovementsVariables['filter']
>;

/*
 * Type-driven, EXHAUSTIVE filter definitions (the reference vertical's
 * listFilters shape): keyed by EVERY key of the generated
 * StockRelocationFilterInput — expose or dismiss, nothing by accident; the
 * map's key order is the toolbar's display order. Built once at module load;
 * labels are lazy accessors so a language switch re-labels in place.
 *
 * Exposed set per spec/stock-movements/ui-surface.md S1 § filters: Number,
 * Status (the default chip — seeded in the list's DEFAULT_STATE; D96),
 * Created by, Created range.
 */
const FILTERS: Filter<StockMovementFilter>[] =
  constructFilters<StockMovementFilter>({
    // ─ user-facing, in display order ──────────────────────────────────────
    stockMovementNumber: {
      label: () => t('label.number'),
      render: props => (
        <FilterNumberInput
          label={t('label.number')}
          testId={props.testId}
          value={props.filter().stockMovementNumber?.equalTo ?? undefined}
          onChange={value =>
            props.setPartialFilter({
              stockMovementNumber:
                value !== undefined ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    // Status — multi-select "any of" (D110): ticks accumulate into
    // status.equalAny; none → null so the (default) chip stays.
    status: {
      label: () => t('label.status'),
      render: props => (
        <FilterMultiSelect
          label={t('label.status')}
          testId={props.testId}
          placeholder={t('label.any')}
          values={props.filter().status?.equalAny ?? []}
          options={[
            { value: 'NEW', label: STATUS_LABELS.NEW ?? 'NEW' },
            { value: 'CONFIRMED', label: STATUS_LABELS.CONFIRMED ?? '' },
            { value: 'FINALISED', label: STATUS_LABELS.FINALISED ?? '' },
          ]}
          onChange={values =>
            props.setPartialFilter({
              status: values.length ? { equalAny: values } : null,
            })
          }
        />
      ),
    },
    // Created by — the creator's username; `like` is a case-insensitive
    // contains on this resolver, `equalTo` is case-sensitive exact
    // (contract § list rules) — the text filter wants the forgiving one.
    username: {
      label: () => t('label.created-by'),
      render: props => (
        <FilterTextInput
          label={t('label.created-by')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().username?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              username: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    createdDatetime: {
      label: () => t('label.created'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.created')}
          testId={props.testId}
          disableFuture
          value={props.filter().createdDatetime}
          onChange={value => props.setPartialFilter({ createdDatetime: value })}
        />
      ),
    },

    // ─ dismissed (not user-facing) ────────────────────────────────────────
    // Identity — programmatic.
    id: null,
    // ⚠️ Wire trap (contract § list rules): the resolver OVERWRITES
    // filter.storeId with the storeId argument unconditionally — exposing it
    // would offer a control that silently does nothing.
    storeId: null,
  });

export const filterFields = (): Filter<StockMovementFilter>[] => FILTERS;
