import { t } from '@/intl';
import {
  FilterDateRange,
  FilterNumberInput,
  FilterSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { PO_STATUSES, poStatusLabel } from '../purchaseOrderStatus';
import type { PurchaseOrdersVariables } from './purchaseOrders.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping — this is the generated variables' filter shape). It flows straight
// through the FilterBar; there is no parallel value model and no mapper.
export type PurchaseOrderFilter = NonNullable<
  PurchaseOrdersVariables['filter']
>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the purchase-orders list
 * (spec/purchase-orders S1 § filters — six filters: Supplier, Number, Status,
 * and three date ranges). The map passed to `constructFilters` is keyed by
 * EVERY key of the generated PurchaseOrderFilterInput: a key maps to a
 * definition to expose it, or `null` to dismiss it. Being a Record over all of
 * it, it can't compile with a key missing — when the schema gains a filter,
 * codegen adds the key and this map stops compiling until we decide
 * expose-or-dismiss. The map's key order IS the toolbar's display order.
 *
 * Built once at module load (a stable const) so FilterBar's <For> never
 * remounts a chip on a filter edit. Safe despite the t()-driven labels because
 * each `label` is an ACCESSOR read in FilterBar's JSX, and each `render` calls
 * t() lazily — so labels re-translate in place on a language switch.
 *
 * Every filter the list offers is backed by a real filter field: unlike the
 * SORT keys, filtering has no shortfall here (contract § listing orders).
 */
const FILTERS: Filter<PurchaseOrderFilter>[] =
  constructFilters<PurchaseOrderFilter>({
    // ─ user-facing, in display order ────────────────────────────────────────
    // Supplier — a partial, case-insensitive match on the supplier's name
    // (OMS-FUN-PO-15.7). The list's one DEFAULT filter: its key is seeded
    // present-but-empty in the list's DEFAULT_STATE, so the chip is on the bar
    // from arrival.
    supplier: {
      label: () => t('label.supplier'),
      render: props => (
        <FilterTextInput
          label={t('label.supplier')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().supplier?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({ supplier: value ? { like: value } : null })
          }
        />
      ),
    },
    number: {
      label: () => t('label.number'),
      render: props => (
        <FilterNumberInput
          label={t('label.number')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().number?.equalTo ?? undefined}
          onChange={value =>
            props.setPartialFilter({
              number: value === undefined ? null : { equalTo: value },
            })
          }
        />
      ),
    },
    // Status — ONE state at a time (rules § listing orders), so a single
    // select over the five labels in lifecycle order, not a multi-select.
    status: {
      label: () => t('label.status'),
      render: props => (
        <FilterSelect
          label={t('label.status')}
          testId={props.testId}
          value={props.filter().status?.equalTo ?? ''}
          options={[
            { value: '', label: t('label.any') },
            ...PO_STATUSES.map(status => ({
              value: status,
              label: poStatusLabel(status),
            })),
          ]}
          onChange={value =>
            props.setPartialFilter({
              status: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },
    // Confirmed / Sent — DateTime fields, so FilterDateRange type="dateTime"
    // owns the local ⇄ UTC day-boundary conversion (#456).
    confirmedDatetime: {
      label: () => t('label.confirmed-datetime'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.confirmed-datetime')}
          testId={props.testId}
          disableFuture
          value={props.filter().confirmedDatetime}
          onChange={value =>
            props.setPartialFilter({ confirmedDatetime: value })
          }
        />
      ),
    },
    // Requested delivery date — a NaiveDate, so type="date" passes the plain
    // ISO date through, and the future is NOT disabled: a requested delivery
    // date is normally ahead of today.
    requestedDeliveryDate: {
      label: () => t('label.requested-delivery-date'),
      render: props => (
        <FilterDateRange
          type="date"
          label={t('label.requested-delivery-date')}
          testId={props.testId}
          value={props.filter().requestedDeliveryDate}
          onChange={value =>
            props.setPartialFilter({ requestedDeliveryDate: value })
          }
        />
      ),
    },
    sentDatetime: {
      label: () => t('label.sent-datetime'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.sent-datetime')}
          testId={props.testId}
          disableFuture
          value={props.filter().sentDatetime}
          onChange={value => props.setPartialFilter({ sentDatetime: value })}
        />
      ),
    },

    // ─ dismissed (not user-facing) ──────────────────────────────────────────
    // Created — filterable on the wire, but the list's filter menu offers five
    // filters and this is not one of them (spec S1 § filters, matching the
    // reference app's own menu). It stays contract-declared and could be
    // surfaced; we simply don't offer a control.
    createdDatetime: null,
    // Identity / scope — forced by the query, never a user filter (the store
    // scope is the server's own).
    id: null,
    storeId: null,
  });

export const filterFields = (): Filter<PurchaseOrderFilter>[] => FILTERS;
