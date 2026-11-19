import { Show } from 'solid-js';
import { t } from '@/intl';
import {
  dateOfBirthWithAge,
  genderLabel,
  type PatientOption,
} from '@/domain/patient';
import { PatientField } from '../../patients';
import { HeaderField } from '@/ui/layout/Header/HeaderField';
import { StepHeading } from './StepHeading';
import styles from './WhoIsItFor.module.css';

/*
 * Step 1 on the Simple screen (spec/prescriptions ui-surface S9): who the
 * visit is for, on the header's main row. Once someone is chosen, who they
 * are shows beside their name — code, date of birth with age, gender — so
 * staff can check it is the right one of several people with that name.
 */
export const WhoIsItFor = (props: {
  storeId: string;
  patient: PatientOption | null;
  /** While the visit is being dispensed: who it is for can't change. */
  disabled?: boolean;
  /** Someone was chosen in the patient search, or created there. */
  onSelect: (patient: { id: string; name: string }) => void;
  onClear: () => void;
}) => (
  <HeaderField
    label={<StepHeading n={1} label={t('label.who-is-it-for')} />}
    detail={
      // Not keyed: choosing someone else updates the facts in place.
      <Show when={props.patient}>
        {patient => <ChosenPatientDetails patient={patient()} />}
      </Show>
    }
  >
    {/* Picked in the patient search (patients S4), which also creates a
        patient. Unlike a record's patient it can be cleared: nothing is saved
        until Dispense. */}
    <PatientField
      label={t('label.who-is-it-for')}
      hideLabel
      testId="who-is-it-for"
      storeId={props.storeId}
      patient={props.patient ?? undefined}
      disabled={props.disabled}
      onChange={props.onSelect}
      onClear={props.onClear}
    />
  </HeaderField>
);

/*
 * The facts the record carries, in the spec's order; one it doesn't carry is
 * left out rather than shown as a dash. The patient search hands back a
 * patient's id and name only; the page reads their record and hands it back,
 * so the facts show a moment later.
 */
const ChosenPatientDetails = (props: { patient: PatientOption }) => (
  <Show
    when={
      props.patient.code || props.patient.dateOfBirth || props.patient.gender
    }
  >
    <ul class={styles.details} data-testid="chosen-patient-details">
      <Show when={props.patient.code}>
        {code => (
          <li class={styles.fact} data-testid="chosen-patient-code">
            {code()}
          </li>
        )}
      </Show>
      <Show when={props.patient.dateOfBirth}>
        {dob => (
          <li class={styles.fact} data-testid="chosen-patient-dob">
            {dateOfBirthWithAge(dob())}
          </li>
        )}
      </Show>
      <Show when={props.patient.gender}>
        {gender => (
          <li class={styles.fact} data-testid="chosen-patient-gender">
            {genderLabel(gender())}
          </li>
        )}
      </Show>
    </ul>
  </Show>
);
