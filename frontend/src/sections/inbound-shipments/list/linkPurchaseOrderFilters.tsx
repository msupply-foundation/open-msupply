import { t } from '../../../intl';
import {
  FilterDateRange,
  FilterNumberInput,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import type { SentPurchaseOrdersVariables } from './createInboundShipment.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping) — the sentPurchaseOrders query's own filter shape.
export type LinkPurchaseOrderFilter = NonNullable<
  SentPurchaseOrdersVariables['filter']
>;

// All three on the bar from the start (spec S2 → link purchase order modal,
// OMS-REG-REPL-02.38): present-as-null is FilterBar's "added but empty".
export const DEFAULT_LINK_PURCHASE_ORDER_FILTER: LinkPurchaseOrderFilter = {
  supplier: null,
  number: null,
  sentDatetime: null,
};

/*
 * Type-driven, EXHAUSTIVE filter definitions for the link-purchase-order step
 * (spec S2 → link purchase order modal § filters). Keyed by EVERY key of the
 * generated PurchaseOrderFilterInput — expose or dismiss each — so codegen
 * adding a filter key stops compilation until it is classified. Map order is
 * the bar's display order. Built once at module load so FilterBar's <For>
 * never remounts a chip on an edit; the labels are accessors and t() is read
 * lazily, so they still re-translate in place.
 */
export const LINK_PURCHASE_ORDER_FILTERS: Filter<LinkPurchaseOrderFilter>[] =
  constructFilters<LinkPurchaseOrderFilter>({
    // ─ the three default filters, in display order ─
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
      label: () => t('label.purchase-order-number'),
      render: props => (
        <FilterNumberInput
          label={t('label.purchase-order-number')}
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
    // A recorded instant, so no future day; type="dateTime" owns the local ⇄
    // UTC day-boundary conversion.
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

    // ─ dismissed ─
    // Status is pinned to SENT by the step itself (the parent merges it into
    // the query), never a user choice here.
    status: null,
    id: null,
    storeId: null,
    createdDatetime: null,
    confirmedDatetime: null,
    requestedDeliveryDate: null,
  });
