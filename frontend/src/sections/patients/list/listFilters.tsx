import { t } from '../../../intl';
import {
  FilterMultiSelect,
  FilterTextInput,
  FilterDate,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { patientPreferences } from '../../../store/storeContext';
import { genderOptions, type Gender } from '../../../domain/patient';
import type { PatientsVariables } from './patients.generated';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping). Flows straight through the FilterBar; no parallel value model.
export type PatientFilter = NonNullable<PatientsVariables['filter']>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the patient list
 * (spec/patients S1 › Filters, AC-L2/L3). The map passed to constructFilters
 * is keyed by EVERY key of PatientFilterInput: a definition to expose, or
 * `null` to dismiss — so codegen adding a filter key breaks compilation until
 * it is classified, and this one map is both the definitions and the
 * completeness proof. Map key order is the toolbar display order.
 *
 * Text filters match as substrings ({ like }); the Patient ID (identifier)
 * filter is the broad OR match across code / secondary code / name / program-
 * enrolment id (AC-L3); date of birth matches exactly ({ equalTo }) and
 * gender as any of the ticked values ({ equalAny }, D110).
 * Custom-field filtering rides on its own bar (the shared customFieldFilters →
 * dynamicFilter, spec/ui-standards/custom-fields), not a PatientFilter chip, so
 * `dynamicFilter` stays dismissed in this map.
 */
const FILTERS: Filter<PatientFilter>[] = constructFilters<PatientFilter>({
  // ─ default-shown (seeded present-as-null in the list's DEFAULT_STATE) ─
  firstName: {
    label: () => t('label.first-name'),
    render: props => (
      <FilterTextInput
        label={t('label.first-name')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().firstName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ firstName: value ? { like: value } : null })
        }
      />
    ),
  },
  lastName: {
    label: () => t('label.last-name'),
    render: props => (
      <FilterTextInput
        label={t('label.last-name')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().lastName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ lastName: value ? { like: value } : null })
        }
      />
    ),
  },
  // Patient ID — the broad identifier match (AC-L3), shown as "Patient ID".
  identifier: {
    label: () => t('label.patient-id'),
    render: props => (
      <FilterTextInput
        label={t('label.patient-id')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().identifier?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({ identifier: value ? { like: value } : null })
        }
      />
    ),
  },

  // ─ addable ─
  dateOfBirth: {
    label: () => t('label.date-of-birth'),
    render: props => (
      <FilterDate
        label={t('label.date-of-birth')}
        testId={props.testId}
        value={props.filter().dateOfBirth?.equalTo ?? ''}
        onInput={value =>
          props.setPartialFilter({
            dateOfBirth: value ? { equalTo: value } : null,
          })
        }
      />
    ),
  },
  // Gender — a multi-select over the store's configured subset (AC-G3),
  // matching any of the ticks via gender.equalAny (honoured — contract §
  // listing; D110). None → null so the chip stays.
  gender: {
    label: () => t('label.gender'),
    render: props => (
      <FilterMultiSelect<Gender>
        label={t('label.gender')}
        testId={props.testId}
        placeholder={t('label.any')}
        values={props.filter().gender?.equalAny ?? []}
        options={genderOptions().map(o => ({ value: o.value, label: o.label }))}
        onChange={values =>
          props.setPartialFilter({
            gender: values.length ? { equalAny: values } : null,
          })
        }
      />
    ),
  },
  nextOfKinName: {
    label: () => t('label.next-of-kin'),
    render: props => (
      <FilterTextInput
        label={t('label.next-of-kin')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().nextOfKinName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            nextOfKinName: value ? { like: value } : null,
          })
        }
      />
    ),
  },
  // Program enrolment — only offered under the program module (gated in
  // filterFields below), matched as a substring.
  programEnrolmentName: {
    label: () => t('label.program-enrolment'),
    render: props => (
      <FilterTextInput
        label={t('label.program-enrolment')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().programEnrolmentName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            programEnrolmentName: value ? { like: value } : null,
          })
        }
      />
    ),
  },

  // ─ dismissed (not user-facing list filters) ─
  id: null,
  name: null,
  code: null,
  code2: null,
  phone: null,
  address1: null,
  address2: null,
  country: null,
  email: null,
  dateOfDeath: null,
  // Custom-field condition AST — driven by the (separate-vertical) custom-field
  // columns, not a standalone chip.
  dynamicFilter: null,
});

// Program-enrolment name is a program-module surface (AC-G2): drop it when the
// module is off. Filtering the stable FILTERS array keeps each surviving chip's
// reference stable, so FilterBar's <For> reuses rows rather than remounting.
export const filterFields = (): Filter<PatientFilter>[] => {
  const { programModule } = patientPreferences();
  return FILTERS.filter(f => programModule || f.key !== 'programEnrolmentName');
};
