import { t } from '../../../intl';
import {
  FilterMultiSelect,
  FilterTextInput,
  FilterDateRange,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { prescriptionPreferences } from '../../../store/storeContext';
import {
  STATUS_LABEL_KEYS,
  type PrescriptionStatus,
} from '../prescriptionStatus';
import type { PrescriptionsVariables } from './prescriptions.generated';

// The prescriptions list filters (spec/prescriptions/ui-surface.md S1):
// Name + the date pair are on by default (DEFAULT_STATE pre-seeds their keys
// as added-but-empty); Status / Reference / Invoice number join via the
// filter menu. The filter object is exactly the generated GraphQL shape
// (kdd/type-safety — no remapping); the map is exhaustive over
// InvoiceFilterInput so a schema addition stops compiling until a decision is
// made (the stocktakes listFilters pattern).
export type PrescriptionFilter = NonNullable<PrescriptionsVariables['filter']>;

// The status filter's option set (AC-PR2): the lifecycle statuses limited by
// the invoice-status-options preference — an unresolved/empty preference
// restricts nothing (the permissive default, D7's precedent) — with CANCELLED
// always offered (it is a real list state regardless of the preference).
const statusOptions = (): {
  value: PrescriptionStatus;
  label: string;
}[] => {
  const allowed = prescriptionPreferences().invoiceStatusOptions;
  const lifecycle: PrescriptionStatus[] = ['NEW', 'PICKED', 'VERIFIED'];
  const offered = lifecycle.filter(
    status => allowed.length === 0 || allowed.includes(status)
  );
  return [...offered, 'CANCELLED' as const].map(status => ({
    value: status,
    label: t(STATUS_LABEL_KEYS[status]),
  }));
};

const FILTERS: Filter<PrescriptionFilter>[] =
  constructFilters<PrescriptionFilter>({
    // ─ user-facing, in display order ──────────────────────────────────────
    otherPartyName: {
      label: () => t('label.name'),
      render: props => (
        <FilterTextInput
          label={t('label.name')}
          testId={props.testId}
          value={props.filter().otherPartyName?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              otherPartyName: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    // Prescription date — a DateTime field (created-or-backdated coalescence,
    // AC-L1); FilterDateRange (type="dateTime") owns the local ⇄ UTC
    // conversion (#456).
    createdOrBackdatedDatetime: {
      label: () => t('label.dispensed-date'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.dispensed-date')}
          testId={props.testId}
          value={props.filter().createdOrBackdatedDatetime}
          onChange={value =>
            props.setPartialFilter({ createdOrBackdatedDatetime: value })
          }
        />
      ),
    },
    // Status — multi-select "any of" (D110): ticks accumulate into
    // status.equalAny; none → null so the chip stays. NARROW, never assert:
    // the wire field spans every invoice status (a stale URL could carry
    // any), so keep only the prescription vocabulary.
    status: {
      label: () => t('label.status'),
      render: props => (
        <FilterMultiSelect
          label={t('label.status')}
          testId={props.testId}
          placeholder={t('label.any')}
          values={(props.filter().status?.equalAny ?? []).filter(
            (status): status is PrescriptionStatus =>
              status in STATUS_LABEL_KEYS
          )}
          options={statusOptions()}
          onChange={values =>
            props.setPartialFilter({
              status: values.length ? { equalAny: values } : null,
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
          value={props.filter().theirReference?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              theirReference: value ? { like: value } : null,
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
          value={`${props.filter().invoiceNumber?.equalTo ?? ''}`}
          onInput={value => {
            const parsed = Number(value);
            props.setPartialFilter({
              invoiceNumber:
                value && Number.isFinite(parsed) ? { equalTo: parsed } : null,
            });
          }}
        />
      ),
    },

    // ─ dismissed (not user-facing) ────────────────────────────────────────
    // The list always pins type PRESCRIPTION programmatically; the store scope
    // is the server's. `dynamicFilter` carries the custom-field filters, built
    // from the FilterBar's separate custom-field group (see the list view), not
    // a chip in this wire-filter map.
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
    createdDatetime: null,
    allocatedDatetime: null,
    pickedDatetime: null,
    shippedDatetime: null,
    deliveredDatetime: null,
    receivedDatetime: null,
    verifiedDatetime: null,
    colour: null,
    requisitionId: null,
    linkedInvoiceId: null,
    isProgramInvoice: null,
    purchaseOrderId: null,
    purchaseOrderNumber: null,
    prescriptionRequestId: null,
    linkedOrderNumber: null,
    programId: null,
    dynamicFilter: null,
  });

export const filterFields = (): Filter<PrescriptionFilter>[] => FILTERS;
