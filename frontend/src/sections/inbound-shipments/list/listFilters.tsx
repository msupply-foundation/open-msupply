import { t } from '../../../intl';
import {
  FilterMultiSelect,
  FilterSelect,
  FilterTextInput,
  FilterNumberInput,
  FilterDate,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { stripEmpty } from '../../../typeHelpers';
import type { InboundScope } from '../inboundShipmentScope';
import type { InboundShipmentsVariables } from './inboundShipments.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety — no
// remapping; the generated variables' filter shape flows straight through
// FilterBar). Mirrors the stocktakes list-filter pattern.
export type InboundFilter = NonNullable<InboundShipmentsVariables['filter']>;

// The origin of an inbound shipment (spec S1 filters → Type; the spec glossary
// "Kind"). NOT a server filter field: `inboundType` is output-only, so origin
// is reconstructed from the query `type` scope + the `requisitionId` filter
// (see inboundQueryInputs). The two server "manual" types (internal/external
// supplier) can't be split by any filter, so they collapse into one `manual`.
export type OriginKind = 'manual' | 'fromInternalOrder' | 'fromPurchaseOrder';

// The list's own filter state: the GraphQL InvoiceFilterInput plus the
// client-only `kind` origin selector. `kind` is stripped (and turned into its
// server consequences) before the query, so every generated InvoiceFilterInput
// key still flows through unchanged (kdd/type-safety); this only ADDS a UI-only
// field, it doesn't remap the server shape.
export type InboundListFilter = InboundFilter & { kind?: OriginKind | null };

// Resolve the list filter into the actual query inputs, splitting the
// client-only `kind` into its two server consequences — the scope `type` arg
// and a `requisitionId` filter:
//   • manual            → plain scope,    requisitionId IS NULL
//   • fromInternalOrder → plain scope,    requisitionId IS NOT NULL
//   • fromPurchaseOrder → external scope  (purchaseOrderId IS NOT NULL)
// The scope is intersected with the scopes the user holds: requesting a scope
// they lack refuses the WHOLE list (contract → permissions), and a kind whose
// scope they don't hold yields an empty `type`, which the caller renders as the
// empty state. Verified against the reference datafile (Kopu): manual 146,
// fromInternalOrder 10, fromPurchaseOrder 34 — 190 total.
export const inboundQueryInputs = (
  listFilter: InboundListFilter,
  held: InboundScope[]
): { filter: InboundFilter; type: InboundScope[] } => {
  const { kind, ...rest } = listFilter;
  const filter: InboundFilter = stripEmpty(rest);

  const type = held.filter(scope =>
    kind === 'fromPurchaseOrder'
      ? scope === 'INBOUND_SHIPMENT_EXTERNAL'
      : kind === 'manual' || kind === 'fromInternalOrder'
        ? scope === 'INBOUND_SHIPMENT'
        : true
  );

  // Within the plain scope purchaseOrderId is always null, so requisitionId
  // alone splits manual from from-internal-order. There is no isNull operator:
  // `equalAnyOrNull: []` matches null only (IS NULL); `notEqualTo` excludes
  // nulls by SQL semantics, so an empty-string sentinel = IS NOT NULL (no real
  // id is empty).
  if (kind === 'manual') filter.requisitionId = { equalAnyOrNull: [] };
  else if (kind === 'fromInternalOrder')
    filter.requisitionId = { notEqualTo: '' };

  return { filter, type };
};

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

// Origin (Type) values offered in the single-select (spec S1 filters). '' is
// the "Any" clear choice, matching the stocktakes status select.
const KIND_OPTIONS: readonly { value: OriginKind | ''; label: string }[] = [
  { value: '', label: t('label.any') },
  { value: 'manual', label: t('label.manual') },
  { value: 'fromInternalOrder', label: t('label.from-internal-order') },
  { value: 'fromPurchaseOrder', label: t('label.from-purchase-order') },
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
 * (spec S1 → filters). The map is keyed by EVERY key of InboundListFilter —
 * the generated InvoiceFilterInput plus the client-only `kind` origin selector:
 * a key maps to a definition to expose it, or `null` to dismiss it. Being a
 * Record over all of it, it can't compile with a key missing — when the schema
 * gains a filter, codegen adds the key and this map stops compiling until we
 * decide expose-or-dismiss. The map's key order IS the toolbar display order.
 * Built once at module load (stable const).
 */
const FILTERS: Filter<InboundListFilter>[] =
  constructFilters<InboundListFilter>({
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
    // Type — the shipment's origin (spec S1 filters). A client-only selector
    // (not a server filter key), resolved into the query scope + requisitionId
    // by inboundQueryInputs; single-select with an "Any" clear choice.
    kind: {
      label: () => t('label.type'),
      render: props => (
        <FilterSelect
          label={t('label.type')}
          testId={props.testId}
          value={props.filter().kind ?? ''}
          options={KIND_OPTIONS}
          onChange={value => props.setPartialFilter({ kind: value || null })}
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
              linkedOrderNumber:
                value === undefined ? null : { equalTo: value },
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
            value={toDateInput(
              props.filter().deliveredDatetime?.afterOrEqualTo
            )}
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
            value={toDateInput(
              props.filter().deliveredDatetime?.beforeOrEqualTo
            )}
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
    // Set programmatically by the Type (`kind`) filter, never directly — see
    // inboundQueryInputs (manual = IS NULL, from-internal-order = IS NOT NULL).
    requisitionId: null,
    // Custom-field property filtering (2026-07-21 schema refresh): the wire
    // vehicle for the current app's user-facing property filter chips (a
    // condition AST over store properties/custom fields). Dismissed only
    // because spec/inbound-shipments S1 doesn't spec property filters yet —
    // REVISIT with the custom-fields work, which should spec and expose it.
    dynamicFilter: null,
    linkedInvoiceId: null,
    isProgramInvoice: null,
    purchaseOrderId: null,
    purchaseOrderNumber: null,
    programId: null,
  });

export const filterFields = (): Filter<InboundListFilter>[] => FILTERS;
