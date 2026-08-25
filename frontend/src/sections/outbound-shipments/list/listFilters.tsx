import { t } from '../../../intl';
import {
  FilterDateRange,
  FilterMultiSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { STATUS_LABELS } from '../outboundStatus';
import { allowedStatuses } from '../outboundStatusOptions';
import type { OutboundShipmentsVariables } from './outboundShipments.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping). The `type` key is NOT part of the user-facing filter state — the
// view pins `type: { equalTo: OUTBOUND_SHIPMENT }` into the variables itself.
export type OutboundFilter = NonNullable<OutboundShipmentsVariables['filter']>;

type StatusValue = NonNullable<
  NonNullable<NonNullable<OutboundFilter['status']>['equalAny']>[number]
>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the outbound-shipments list
 * (spec S1 § filters): keyed by EVERY key of the generated InvoiceFilterInput —
 * a definition to expose it, `null` to dismiss it. When the schema gains a
 * filter key this map stops compiling until we decide expose-or-dismiss (see
 * the stocktakes listFilters for the full rationale).
 *
 * Exposed, in display order: Customer (contains), Status (multi-select, any
 * of — the server honours status.equalAny on this list, contract.md § the
 * list), Number (equals), Reference (contains), Created range, Shipped range.
 */
const FILTERS: Filter<OutboundFilter>[] = constructFilters<OutboundFilter>({
  // ─ user-facing, in display order ─────────────────────────────────────────
  otherPartyName: {
    label: () => t('label.name'),
    render: props => (
      <FilterTextInput
        label={t('label.name')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().otherPartyName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            otherPartyName: value ? { like: value } : null,
          })
        }
      />
    ),
  },
  status: {
    label: () => t('label.status'),
    render: props => (
      <FilterMultiSelect<StatusValue>
        label={t('label.status')}
        testId={props.testId}
        placeholder={t('label.any')}
        values={props.filter().status?.equalAny ?? []}
        // Options limited by the _invoice status options_ preference
        // (OMS-REG-DIST-04.22); computed in render so the preference fetch
        // resolves reactively.
        options={allowedStatuses().map(value => ({
          value: value as StatusValue,
          label: STATUS_LABELS[value],
        }))}
        onChange={values =>
          props.setPartialFilter({
            status: values.length ? { equalAny: values } : null,
          })
        }
      />
    ),
  },
  invoiceNumber: {
    label: () => t('label.invoice-number'),
    render: props => (
      <FilterTextInput
        label={t('label.invoice-number')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().invoiceNumber?.equalTo?.toString() ?? ''}
        onInput={value => {
          const n = Number.parseInt(value, 10);
          props.setPartialFilter({
            invoiceNumber: Number.isNaN(n) ? null : { equalTo: n },
          });
        }}
      />
    ),
  },
  theirReference: {
    label: () => t('label.reference'),
    render: props => (
      <FilterTextInput
        label={t('label.reference')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().theirReference?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            theirReference: value ? { like: value } : null,
          })
        }
      />
    ),
  },
  // Created / Shipped — DateTime fields; FilterDateRange (type="dateTime")
  // owns the local ⇄ UTC conversion (#456).
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
  shippedDatetime: {
    label: () => t('label.shipped'),
    render: props => (
      <FilterDateRange
        type="dateTime"
        label={t('label.shipped')}
        testId={props.testId}
        value={props.filter().shippedDatetime}
        onChange={value => props.setPartialFilter({ shippedDatetime: value })}
      />
    ),
  },

  // ─ dismissed (not user-facing) ───────────────────────────────────────────
  // Pinned by the view, never a user filter.
  type: null,
  // The tablet simplified layout's single search box — not offered on the
  // standard layout this build targets (ui-surface § cross-cutting).
  invoiceNumberOrStatus: null,
  // Identity / relational / programmatic filters.
  id: null,
  nameId: null,
  otherPartyId: null,
  storeId: null,
  userId: null,
  requisitionId: null,
  linkedInvoiceId: null,
  purchaseOrderId: null,
  purchaseOrderNumber: null,
  linkedOrderNumber: null,
  programId: null,
  isProgramInvoice: null,
  // Header fields without a specced list filter.
  onHold: null,
  comment: null,
  transportReference: null,
  colour: null,
  // Other lifecycle datetimes — only Created and Shipped are specced filters.
  allocatedDatetime: null,
  pickedDatetime: null,
  deliveredDatetime: null,
  receivedDatetime: null,
  verifiedDatetime: null,
  createdOrBackdatedDatetime: null,
  // Programmatic filter, not a specced list filter.
  dynamicFilter: null,
});

export const filterFields = (): Filter<OutboundFilter>[] => FILTERS;
