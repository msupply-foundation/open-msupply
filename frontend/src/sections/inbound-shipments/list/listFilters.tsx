import { t } from '../../../intl';
import {
  FilterMultiSelect,
  FilterTextInput,
  FilterNumberInput,
  FilterDate,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import type { InboundShipmentsVariables } from './inboundShipments.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety — no
// remapping; the generated variables' filter shape flows straight through
// FilterBar). Mirrors the stocktakes list-filter pattern.
export type InboundFilter = NonNullable<InboundShipmentsVariables['filter']>;

// Inbound status values offered in the multi-select (spec S1 filters). PICKED
// only ever appears on a transfer, but the server honours it in the filter.
const STATUS_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'NEW', label: t('label.new') },
  { value: 'PICKED', label: t('label.picked') },
  { value: 'SHIPPED', label: t('label.shipped') },
  { value: 'DELIVERED', label: t('label.delivered') },
  { value: 'RECEIVED', label: t('label.received') },
  { value: 'VERIFIED', label: t('label.verified') },
];

// A native date (yyyy-mm-dd) → the day's inclusive datetime bounds, so a
// DatetimeFilterInput can express a "between" range from date-only inputs.
const startOfDay = (d: string) => `${d}T00:00:00.000Z`;
const endOfDay = (d: string) => `${d}T23:59:59.999Z`;
// A stored bound (full ISO datetime) → the yyyy-mm-dd the date input shows.
const toDateInput = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10) : '';

/*
 * Type-driven, EXHAUSTIVE filter definitions for the inbound-shipments list
 * (spec S1 → filters). The map is keyed by EVERY key of the generated
 * InvoiceFilterInput: a key maps to a definition to expose it, or `null` to
 * dismiss it. Being a Record over all of InboundFilter it can't compile with a
 * key missing — when the schema gains a filter, codegen adds the key and this
 * map stops compiling until we decide expose-or-dismiss. The map's key order IS
 * the toolbar display order. Built once at module load (stable const).
 */
const FILTERS: Filter<InboundFilter>[] = constructFilters<InboundFilter>({
  // ─ user-facing, in display order ────────────────────────────────────────
  otherPartyName: {
    label: () => t('label.name'),
    render: props => (
      <FilterTextInput
        label={t('label.name')}
        testId={props.testId}
        placeholder={t('label.name')}
        value={props.filter().otherPartyName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            otherPartyName: value ? { like: value } : null,
          })
        }
      />
    ),
  },
  invoiceNumber: {
    label: () => t('label.invoice-number'),
    render: props => (
      <FilterNumberInput
        label={t('label.invoice-number')}
        testId={props.testId}
        placeholder={t('label.invoice-number')}
        value={props.filter().invoiceNumber?.equalTo ?? undefined}
        onChange={value =>
          props.setPartialFilter({
            invoiceNumber: value === undefined ? null : { equalTo: value },
          })
        }
      />
    ),
  },
  status: {
    label: () => t('label.status'),
    render: props => (
      <FilterMultiSelect
        label={t('label.status')}
        testId={props.testId}
        placeholder={t('label.any')}
        // Multi-select → status.equalAny (spec AC-L1: matches ANY of the chosen
        // statuses). The generated element type is the InvoiceNodeStatus union,
        // so the string values narrow at the boundary.
        values={props.filter().status?.equalAny ?? []}
        options={STATUS_OPTIONS}
        onChange={values =>
          props.setPartialFilter({
            status: values.length
              ? {
                  equalAny: values as NonNullable<
                    InboundFilter['status']
                  >['equalAny'],
                }
              : null,
          })
        }
      />
    ),
  },
  theirReference: {
    label: () => t('label.reference'),
    render: props => (
      <FilterTextInput
        label={t('label.reference')}
        testId={props.testId}
        placeholder={t('label.reference')}
        value={props.filter().theirReference?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            theirReference: value ? { like: value } : null,
          })
        }
      />
    ),
  },
  // Linked order number — matches either a linked purchase-order or
  // internal-order number (spec S1).
  linkedOrderNumber: {
    label: () => t('label.linked-order'),
    render: props => (
      <FilterNumberInput
        label={t('label.linked-order')}
        testId={props.testId}
        placeholder={t('label.linked-order')}
        value={props.filter().linkedOrderNumber?.equalTo ?? undefined}
        onChange={value =>
          props.setPartialFilter({
            linkedOrderNumber: value === undefined ? null : { equalTo: value },
          })
        }
      />
    ),
  },
  // Created date — a between range built from two native date inputs.
  createdDatetime: {
    label: () => t('label.created'),
    render: props => (
      <span style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
        <FilterDate
          label={t('label.from')}
          testId={props.testId}
          value={toDateInput(props.filter().createdDatetime?.afterOrEqualTo)}
          onInput={value =>
            props.setPartialFilter({
              createdDatetime: {
                ...props.filter().createdDatetime,
                afterOrEqualTo: value ? startOfDay(value) : undefined,
              },
            })
          }
        />
        <FilterDate
          label={t('label.to')}
          value={toDateInput(props.filter().createdDatetime?.beforeOrEqualTo)}
          onInput={value =>
            props.setPartialFilter({
              createdDatetime: {
                ...props.filter().createdDatetime,
                beforeOrEqualTo: value ? endOfDay(value) : undefined,
              },
            })
          }
        />
      </span>
    ),
  },
  deliveredDatetime: {
    label: () => t('label.delivered'),
    render: props => (
      <span style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
        <FilterDate
          label={t('label.from')}
          testId={props.testId}
          value={toDateInput(props.filter().deliveredDatetime?.afterOrEqualTo)}
          onInput={value =>
            props.setPartialFilter({
              deliveredDatetime: {
                ...props.filter().deliveredDatetime,
                afterOrEqualTo: value ? startOfDay(value) : undefined,
              },
            })
          }
        />
        <FilterDate
          label={t('label.to')}
          value={toDateInput(props.filter().deliveredDatetime?.beforeOrEqualTo)}
          onInput={value =>
            props.setPartialFilter({
              deliveredDatetime: {
                ...props.filter().deliveredDatetime,
                beforeOrEqualTo: value ? endOfDay(value) : undefined,
              },
            })
          }
        />
      </span>
    ),
  },

  // ─ dismissed (not user-facing) ────────────────────────────────────────────
  // Identity / relational / programmatic filters — the store scope and type are
  // forced by the query, never a user filter.
  id: null,
  nameId: null,
  invoiceNumberOrStatus: null,
  otherPartyId: null,
  storeId: null,
  userId: null,
  type: null,
  onHold: null,
  comment: null,
  transportReference: null,
  allocatedDatetime: null,
  pickedDatetime: null,
  shippedDatetime: null,
  receivedDatetime: null,
  verifiedDatetime: null,
  createdOrBackdatedDatetime: null,
  colour: null,
  requisitionId: null,
  // Plugin-defined dynamic filtering (2026-07-21 schema refresh) —
  // programmatic, not a user-facing list filter.
  dynamicFilter: null,
  linkedInvoiceId: null,
  isProgramInvoice: null,
  purchaseOrderId: null,
  purchaseOrderNumber: null,
  programId: null,
});

export const filterFields = (): Filter<InboundFilter>[] => FILTERS;
