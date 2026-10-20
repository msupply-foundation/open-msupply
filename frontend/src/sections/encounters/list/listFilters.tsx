import { t } from '../../../intl';
import {
  FilterSelect,
  FilterTextInput,
  FilterDateRange,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { encounterStatusLabel } from '../../../domain/encounter/encounterColumns';
import type { EncounterListVariables } from './encounters.generated';

// The encounter list's filters (spec/encounters/ui-surface.md S1 › filters),
// all added from the filter menu. The filter object is the generated GraphQL
// shape (kdd/type-safety); the map is exhaustive over EncounterFilterInput so a
// schema addition stops compiling until a decision is made.
export type EncounterFilter = NonNullable<EncounterListVariables['filter']>;

type ShownStatus = 'PENDING' | 'VISITED' | 'CANCELLED';

// Deleted is never shown, so never offered (spec/encounters/rules.md § who
// sees which encounters).
const STATUSES: readonly ShownStatus[] = ['PENDING', 'VISITED', 'CANCELLED'];

const isShownStatus = (
  value: string | null | undefined
): value is ShownStatus => STATUSES.some(status => status === value);

// A status carried in from a URL that the list never offers reads as none.
const shownStatus = (filter: EncounterFilter): ShownStatus | '' => {
  const status = filter.status?.equalTo;
  return isShownStatus(status) ? status : '';
};

const FILTERS: Filter<EncounterFilter>[] = constructFilters<EncounterFilter>({
  // ─ user-facing, in menu order ───────────────────────────────────────────
  // Last name only: the patient filter's first-name and code fields stay
  // unsent (OMS-REG-DIS-11.20).
  patient: {
    label: () => t('label.last-name'),
    render: props => (
      <FilterTextInput
        label={t('label.last-name')}
        testId={props.testId}
        value={props.filter().patient?.lastName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            patient: value ? { lastName: { like: value } } : null,
          })
        }
      />
    ),
  },
  // The program's enrolment name, the text the Program column shows
  // (spec/encounters/contract.md § listing).
  programEnrolment: {
    label: () => t('label.program'),
    render: props => (
      <FilterTextInput
        label={t('label.program')}
        testId={props.testId}
        value={props.filter().programEnrolment?.programName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            programEnrolment: value ? { programName: { like: value } } : null,
          })
        }
      />
    ),
  },
  // A DateTime field, so FilterDateRange widens each picked local day. Future
  // days stay selectable: a Scheduled encounter lies ahead (OMS-REG-DIS-11.23).
  startDatetime: {
    label: () => t('label.start-date'),
    render: props => (
      <FilterDateRange
        type="dateTime"
        label={t('label.start-date')}
        testId={props.testId}
        value={props.filter().startDatetime}
        onChange={value => props.setPartialFilter({ startDatetime: value })}
      />
    ),
  },
  status: {
    label: () => t('label.status'),
    render: props => (
      <FilterSelect<ShownStatus>
        label={t('label.status')}
        testId={props.testId}
        value={shownStatus(props.filter())}
        options={STATUSES.map(status => ({
          value: status,
          label: encounterStatusLabel(status),
        }))}
        onChange={value =>
          props.setPartialFilter({
            status: value ? { equalTo: value } : null,
          })
        }
      />
    ),
  },

  // ─ dismissed (not user-facing) ──────────────────────────────────────────
  // includeDeleted is never sent: a deleted encounter never shows.
  id: null,
  type: null,
  patientId: null,
  programId: null,
  createdDatetime: null,
  endDatetime: null,
  clinicianId: null,
  documentName: null,
  documentData: null,
  includeDeleted: null,
});

export const filterFields = (): Filter<EncounterFilter>[] => FILTERS;
