import { t } from '../../../intl';
import {
  FilterSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { DateRangeField } from '../../../ui/elements/inputs/DateRangeField';
import { utcToLocalParts } from '../../../ui/elements/inputs/dateTimeConvert';
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

// A picked calendar day widened to an inclusive local-day instant — the
// createdOrBackdatedDatetime field is a DateTime (the backdated-or-created
// coalescence the list sorts and filters by; AC-L1).
const dayStart = (iso: string) => new Date(`${iso}T00:00:00`).toISOString();
const dayEnd = (iso: string) => new Date(`${iso}T23:59:59.999`).toISOString();
const localDay = (utc: string | null | undefined) =>
  utcToLocalParts(utc)?.date ?? null;

// The status filter's option set (AC-PR2): the lifecycle statuses limited by
// the invoice-status-options preference — an unresolved/empty preference
// restricts nothing (the permissive default, D7's precedent) — with CANCELLED
// always offered (it is a real list state regardless of the preference).
const statusOptions = (): {
  value: PrescriptionStatus | '';
  label: string;
}[] => {
  const allowed = prescriptionPreferences().invoiceStatusOptions;
  const lifecycle: PrescriptionStatus[] = ['NEW', 'PICKED', 'VERIFIED'];
  const offered = lifecycle.filter(
    status => allowed.length === 0 || allowed.includes(status)
  );
  return [
    { value: '', label: t('label.any') },
    ...[...offered, 'CANCELLED' as const].map(status => ({
      value: status,
      label: t(STATUS_LABEL_KEYS[status]),
    })),
  ];
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
    createdOrBackdatedDatetime: {
      label: () => t('label.prescription-date'),
      render: props => (
        <DateRangeField
          label={t('label.prescription-date')}
          hideLabel
          size="small"
          testId={props.testId}
          value={{
            start: localDay(
              props.filter().createdOrBackdatedDatetime?.afterOrEqualTo
            ),
            end: localDay(
              props.filter().createdOrBackdatedDatetime?.beforeOrEqualTo
            ),
          }}
          onChange={({ start, end }) =>
            props.setPartialFilter({
              createdOrBackdatedDatetime:
                start || end
                  ? {
                      ...(start ? { afterOrEqualTo: dayStart(start) } : {}),
                      ...(end ? { beforeOrEqualTo: dayEnd(end) } : {}),
                    }
                  : null,
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
          value={
            (props.filter().status?.equalTo ?? '') as PrescriptionStatus | ''
          }
          options={statusOptions()}
          onChange={value =>
            props.setPartialFilter({
              status: value ? { equalTo: value } : null,
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
    // is the server's. Custom-field (dynamicFilter) filtering is deferred with
    // the custom-fields surfaces (see the build report).
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
    linkedOrderNumber: null,
    programId: null,
    dynamicFilter: null,
  });

export const filterFields = (): Filter<PrescriptionFilter>[] => FILTERS;
