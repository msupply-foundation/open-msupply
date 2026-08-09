import { t } from '../../../intl';
import {
  FilterSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { STATUS_LABELS } from '../detail/returnStatus';
import type { SupplierReturnsVariables } from './supplierReturns.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping). The vertical's own type pin — the list query pins
// type = SUPPLIER_RETURN in the fetcher, never here, so the URL carries only
// the user's choices.
export type ReturnsFilter = NonNullable<SupplierReturnsVariables['filter']>;

// The status choices offered (spec/supplier-returns/ui-surface.md S1): the
// supplier return's forward sequence plus its transfer-counterpart display
// stages — further limited by the invoice-status-options preference (rules
// § preference gates), read lazily per render via the accessor the list passes
// in. Single-select equalTo (the shared invoices resolver's honoured operator,
// mirroring the stocktakes finding).
const STATUS_OPTIONS = [
  'NEW',
  'PICKED',
  'SHIPPED',
  'RECEIVED',
  'VERIFIED',
] as const;

/*
 * Type-driven, EXHAUSTIVE filter definitions (the reference vertical's
 * listFilters shape): keyed by EVERY key of the generated InvoiceFilterInput —
 * a key maps to a definition to expose it, or `null` to dismiss it. When the
 * schema gains a filter key, codegen adds it and this map stops compiling
 * until we decide expose-or-dismiss. The map's key order is the toolbar's
 * display order.
 *
 * A FACTORY (not a module-level const like the reference): the status
 * options are limited by the invoice-status-options preference, which the
 * list fetches per store. Built once per list mount with a stable identity —
 * the accessor is read lazily inside each render closure, so a resolving
 * preference updates the options in place without rebuilding the array
 * (kdd/state-management: no remounts).
 */
export const createFilters = (
  allowedStatuses: () => readonly string[]
): Filter<ReturnsFilter>[] =>
  constructFilters<ReturnsFilter>({
    // ─ user-facing (spec/supplier-returns/ui-surface.md S1 § filters)
    otherPartyName: {
      label: () => t('label.name'),
      render: props => (
        <FilterTextInput
          label={t('label.name')}
          testId={props.testId}
          placeholder={t('placeholder.search')}
          value={props.filter().otherPartyName?.like ?? ''}
          // Blank box → null, never { like: '' } (an empty like would match as
          // a real substring).
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
        <FilterSelect
          label={t('label.status')}
          testId={props.testId}
          value={props.filter().status?.equalTo ?? ''}
          options={[
            { value: '', label: t('label.any') },
            ...STATUS_OPTIONS.filter(
              status =>
                allowedStatuses().length === 0 ||
                allowedStatuses().includes(status)
            ).map(status => ({
              value: status,
              label: STATUS_LABELS[status],
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

    // ─ dismissed (not user-facing list filters)
    // The list is pinned to SUPPLIER_RETURN in the fetcher; exposing type would
    // let a URL escape the vertical.
    type: null,
    // Identity / relational / programmatic filters.
    id: null,
    nameId: null,
    otherPartyId: null,
    storeId: null,
    userId: null,
    requisitionId: null,
    linkedInvoiceId: null,
    purchaseOrderId: null,
    programId: null,
    // Number / reference filters — not offered on this list (the spec's S1
    // names name + status only; number deep-linking goes via the URL).
    invoiceNumber: null,
    invoiceNumberOrStatus: null,
    purchaseOrderNumber: null,
    linkedOrderNumber: null,
    theirReference: null,
    transportReference: null,
    comment: null,
    colour: null,
    onHold: null,
    isProgramInvoice: null,
    // Datetime ranges — no styled date-range filter control yet (same deferral
    // as the reference vertical's stocktakeDate).
    createdDatetime: null,
    allocatedDatetime: null,
    pickedDatetime: null,
    shippedDatetime: null,
    deliveredDatetime: null,
    receivedDatetime: null,
    verifiedDatetime: null,
    createdOrBackdatedDatetime: null,
    // Custom-field filtering rides the shared domain/customFields group
    // (FilterBar `extra`), a separate state slice — not a ReturnsFilter chip.
    dynamicFilter: null,
  });
