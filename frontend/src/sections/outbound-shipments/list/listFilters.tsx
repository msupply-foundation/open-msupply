import { t } from '../../../intl';
import {
  FilterDateRange,
  FilterMultiSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { STATUS_LABELS } from '../outboundStatus';
import { allowedStatuses } from '../outboundPreferencesResource';
import type { OutboundShipmentsVariables } from './outboundShipments.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping). The `type` key is NOT part of the user-facing filter state — the
// view pins `type: { equalTo: OUTBOUND_SHIPMENT }` into the variables itself.
export type OutboundFilter = NonNullable<OutboundShipmentsVariables['filter']>;

type StatusValue = NonNullable<
  NonNullable<NonNullable<OutboundFilter['status']>['equalAny']>[number]
>;

// A native date (yyyy-mm-dd) → the day's inclusive datetime bounds, so a
// DatetimeFilterInput can express a "between" range from date-only inputs.
// The offset is REQUIRED: the server's DateTime scalar parses RFC3339, and a
// bare `T00:00:00` fails with "premature end of input" (same helpers as the
// inbound list).
// TODO: hoist these three to shared code (with the inbound list's identical
// copies) once a third list needs them — and decide there whether a picked
// day means the UTC day (this Z literal) or the store-local day.
const startOfDay = (d: string) => `${d}T00:00:00.000Z`;
const endOfDay = (d: string) => `${d}T23:59:59.999Z`;
// A stored bound (full ISO datetime) → the yyyy-mm-dd the date input shows.
const toDateInput = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10) : '';

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
        placeholder={t('placeholder.search-by-name')}
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
        // Options limited by the _invoice status options_ preference (AC-PR1);
        // computed in render so the preference fetch resolves reactively.
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
        placeholder={t('placeholder.search-by-invoice-number')}
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
        placeholder={t('messages.search')}
        value={props.filter().theirReference?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            theirReference: value ? { like: value } : null,
          })
        }
      />
    ),
  },
  createdDatetime: {
    label: () => t('label.created'),
    // A date range as two bounds on the one key, from the shared date-range
    // picker. Bounds are inclusive (afterOrEqualTo / beforeOrEqualTo, the
    // "to" day extended to its end so the whole day matches).
    render: props => (
      <FilterDateRange
        label={t('label.created')}
        testId={props.testId}
        value={{
          start:
            toDateInput(props.filter().createdDatetime?.afterOrEqualTo) || null,
          end:
            toDateInput(props.filter().createdDatetime?.beforeOrEqualTo) ||
            null,
        }}
        onChange={({ start, end }) =>
          props.setPartialFilter({
            createdDatetime:
              start || end
                ? {
                    afterOrEqualTo: start ? startOfDay(start) : undefined,
                    beforeOrEqualTo: end ? endOfDay(end) : undefined,
                  }
                : null,
          })
        }
      />
    ),
  },
  shippedDatetime: {
    label: () => t('label.shipped'),
    render: props => (
      <FilterDateRange
        label={t('label.shipped')}
        testId={props.testId}
        value={{
          start:
            toDateInput(props.filter().shippedDatetime?.afterOrEqualTo) || null,
          end:
            toDateInput(props.filter().shippedDatetime?.beforeOrEqualTo) ||
            null,
        }}
        onChange={({ start, end }) =>
          props.setPartialFilter({
            shippedDatetime:
              start || end
                ? {
                    afterOrEqualTo: start ? startOfDay(start) : undefined,
                    beforeOrEqualTo: end ? endOfDay(end) : undefined,
                  }
                : null,
          })
        }
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
