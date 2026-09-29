import { t } from '@/intl';
import {
  FilterDateRange,
  FilterNumberInput,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { OutstandingLinesVariables } from './outstandingLines.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping — this is the generated variables' filter shape).
export type OutstandingLineFilter = NonNullable<
  OutstandingLinesVariables['filter']
>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the outstanding-lines list
 * (spec/purchase-orders S5 § filters — four filters: Supplier name, PO number,
 * Item name and an Expected delivery date range). The map passed to
 * `constructFilters` is keyed by EVERY key of the generated
 * PurchaseOrderLineFilterInput: a key maps to a definition to expose it, or
 * `null` to dismiss it, so a schema that gains a filter stops this file
 * compiling until we decide expose-or-dismiss. The map's key order IS the
 * toolbar's display order.
 */
const FILTERS: Filter<OutstandingLineFilter>[] =
  constructFilters<OutstandingLineFilter>({
    // ─ user-facing, in display order ────────────────────────────────────────
    // Supplier name — a partial, case-insensitive match (OMS-FUN-PO-14.3).
    // The list's one DEFAULT filter: its key is seeded present-but-empty in
    // the list's DEFAULT_STATE, so the chip is on the bar from arrival.
    supplierName: {
      label: () => t('label.supplier-name'),
      render: props => (
        <FilterTextInput
          label={t('label.supplier-name')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().supplierName?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              supplierName: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    // PO number — the whole number, exactly (rules § listing outstanding
    // lines): the order's number, not the line's.
    purchaseOrderNumber: {
      label: () => t('label.purchase-order-number'),
      render: props => (
        <FilterNumberInput
          label={t('label.purchase-order-number')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().purchaseOrderNumber?.equalTo ?? undefined}
          onChange={value =>
            props.setPartialFilter({
              purchaseOrderNumber:
                value === undefined ? null : { equalTo: value },
            })
          }
        />
      ),
    },
    itemName: {
      label: () => t('label.item-name'),
      render: props => (
        <FilterTextInput
          label={t('label.item-name')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().itemName?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({ itemName: value ? { like: value } : null })
          }
        />
      ),
    },
    // The line's own expected delivery date — a NaiveDate, so type="date"
    // passes the plain ISO date through, and the future is NOT disabled: an
    // expected delivery date is normally ahead of today. A line with no date
    // is outside every range, so applying this filter HIDES undated lines
    // (OMS-FUN-PO-14.12) — the server's own behaviour, not something the
    // control does.
    expectedDeliveryDate: {
      label: () => t('label.expected-delivery-date'),
      render: props => (
        <FilterDateRange
          type="date"
          label={t('label.expected-delivery-date')}
          testId={props.testId}
          value={props.filter().expectedDeliveryDate}
          onChange={value =>
            props.setPartialFilter({ expectedDeliveryDate: value })
          }
        />
      ),
    },

    // ─ dismissed (not user-facing) ──────────────────────────────────────────
    // The screen's ROW SET, fixed by the list and merged over the user's own
    // filters (contract § listing outstanding lines): a sent line, still owed.
    // Never a user filter — the two are what makes this screen this screen.
    status: null,
    receivedLessThanAdjusted: null,
    // Identity / scope — forced by the query. The store scope is the server's
    // own and has no filter field at all.
    id: null,
    purchaseOrderId: null,
    // The code-or-name filter belongs to an ORDER's own line table (spec S7 §
    // filters). This list offers the item-NAME filter its own spec names (S5 §
    // filters), so the wider search is dismissed here rather than doubling it
    // up.
    itemCodeOrName: null,
  });

export const filterFields = (): Filter<OutstandingLineFilter>[] => FILTERS;
