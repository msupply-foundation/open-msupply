import { t } from '../../../intl';
import {
  FilterMultiSelect,
  FilterTextInput,
  FilterDateRange,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { localTodayIso } from '@/ui/elements/inputs/dateTimeConvert';
import {
  STATUS_LABEL_KEYS,
  type PrescriptionRequestStatus,
} from '../prescriptionRequestStatus';
import type { PrescriptionRequestsVariables } from './prescriptionRequests.generated';

// The prescription-requests list filters
// (spec/prescription-requests/ui-surface.md S1): Patient + the
// prescription-date range are on by default; the dispensed-date range, Status
// and Entered by join via the filter menu. The filter object is exactly the
// generated GraphQL shape (kdd/type-safety — no remapping); the map is
// exhaustive over
// PrescriptionRequestFilterInput so a schema addition stops compiling until a
// decision is made (the stocktakes listFilters pattern).
export type PrescriptionRequestFilter = NonNullable<
  PrescriptionRequestsVariables['filter']
>;

const statusOptions = (): {
  value: PrescriptionRequestStatus;
  label: string;
}[] =>
  (['NEW', 'READY_TO_DISPENSE', 'DISPENSED'] as const).map(status => ({
    value: status,
    label: t(STATUS_LABEL_KEYS[status]),
  }));

const FILTERS: Filter<PrescriptionRequestFilter>[] =
  constructFilters<PrescriptionRequestFilter>({
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
    // Both date ranges filter recorded facts, so future days are unselectable
    // (ui-standards/list-views.md § Filters).
    prescriptionDatetime: {
      label: () => t('label.prescription-date'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.prescription-date')}
          testId={props.testId}
          max={localTodayIso()}
          value={props.filter().prescriptionDatetime}
          onChange={value =>
            props.setPartialFilter({ prescriptionDatetime: value })
          }
        />
      ),
    },
    // The dispensed date: when the hand-over flipped the request to Dispensed
    // (never a status window — see the dashboard's Dispensed-this-week count,
    // whose link lands here with exactly this filter). Menu-only, like Status:
    // it is meaningless on the requests still being worked on.
    dispensedDatetime: {
      label: () => t('label.dispensed-date'),
      render: props => (
        <FilterDateRange
          type="dateTime"
          label={t('label.dispensed-date')}
          testId={props.testId}
          max={localTodayIso()}
          value={props.filter().dispensedDatetime}
          onChange={value =>
            props.setPartialFilter({ dispensedDatetime: value })
          }
        />
      ),
    },
    // Entered by: the account that created the request (rules § who is
    // recorded) — a data-entry fact, never presented as the prescriber.
    // Matched on its username, the only handle the record carries: the wire
    // filter is a sub-select on user_account, and there is no user picker in
    // the app to select from.
    username: {
      label: () => t('label.entered-by'),
      render: props => (
        <FilterTextInput
          label={t('label.entered-by')}
          testId={props.testId}
          value={props.filter().username?.like ?? ''}
          onInput={value =>
            props.setPartialFilter({
              username: value ? { like: value } : null,
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
          values={(props.filter().status?.equalAny ?? []).filter(
            (status): status is PrescriptionRequestStatus =>
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
    // and tests, not chips. `dynamicFilter` carries the custom-field filters,
    // built from the FilterBar's separate custom-field group (see the list
    // view), not a chip in this wire-filter map.
    id: null,
    dynamicFilter: null,
    patientId: null,
    prescriptionRequestNumber: null,
    createdDatetime: null,
  });

export const filterFields = (): Filter<PrescriptionRequestFilter>[] => FILTERS;
