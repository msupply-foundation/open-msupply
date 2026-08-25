import { t } from '../../../intl';
import {
  FilterMultiSelect,
  FilterTextInput,
  FilterDateRange,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import {
  STATUS_LABEL_KEYS,
  type PrescriptionOrderStatus,
} from '../prescriptionOrderStatus';
import type { PrescriptionOrdersVariables } from './prescriptionOrders.generated';

// The prescription-orders list filters (spec/prescription-orders/ui-surface.md
// S1): Patient + the prescription-date range are on by default; Status joins
// via the filter menu. The filter object is exactly the generated GraphQL
// shape (kdd/type-safety — no remapping); the map is exhaustive over
// PrescriptionOrderFilterInput so a schema addition stops compiling until a
// decision is made (the stocktakes listFilters pattern).
export type PrescriptionOrderFilter = NonNullable<
  PrescriptionOrdersVariables['filter']
>;

const statusOptions = (): {
  value: PrescriptionOrderStatus;
  label: string;
}[] =>
  (['NEW', 'READY_TO_DISPENSE', 'DISPENSED'] as const).map(status => ({
    value: status,
    label: t(STATUS_LABEL_KEYS[status]),
  }));

const FILTERS: Filter<PrescriptionOrderFilter>[] =
  constructFilters<PrescriptionOrderFilter>({
    // ─ user-facing, in display order ──────────────────────────────────────
    patientName: {
      label: () => t('label.patient'),
      render: props => (
        <FilterTextInput
          label={t('label.patient')}
          testId={props.testId}
          value={props.filter().patientName?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              patientName: value ? { like: value } : null,
            })
          }
        />
      ),
    },
    prescriptionDatetime: {
      label: () => t('label.prescription-date'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.prescription-date')}
          testId={props.testId}
          value={props.filter().prescriptionDatetime}
          onChange={value =>
            props.setPartialFilter({ prescriptionDatetime: value })
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
          values={(props.filter().status?.equalAny ?? []).filter(
            (status): status is PrescriptionOrderStatus =>
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

    // ─ dismissed (not user-facing) ────────────────────────────────────────
    // The store scope is the server's; id/patientId/number serve deep links
    // and tests, not chips.
    id: null,
    patientId: null,
    prescriptionOrderNumber: null,
    createdDatetime: null,
  });

export const filterFields = (): Filter<PrescriptionOrderFilter>[] => FILTERS;
