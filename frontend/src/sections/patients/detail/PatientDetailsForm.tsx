import type { Component } from 'solid-js';
import { t } from '../../../intl';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { TextField } from '../../../ui/elements/inputs/TextField';
import {
  DateOfBirthControl,
  DeceasedControls,
  GenderControl,
  NextOfKinControl,
  PatientCodeControl,
} from '../../../domain/patient/PatientControls';
import type { PatientDraft } from './patientEdit';

export interface PatientDetailsFormProps {
  storeId: string;
  draft: PatientDraft;
  setField: <K extends keyof PatientDraft>(
    key: K,
    value: PatientDraft[K]
  ) => void;
  disabled?: boolean;
  /**
   * Per-field error message for a given field id (from the form's
   * createFormValidation); undefined when the field is clean or no validation
   * is wired. Fields: `code`, `firstName`, `lastName`.
   */
  errorFor?: (id: string) => string | undefined;
  /**
   * The patient this form is editing — the minted id while creating. The
   * code generator uses it (a patient's own code is not a collision when the
   * generator checks whether a candidate code is already held, spec/patients §
   * generating a code), and the estimated-date mark is scoped to it, so it
   * cannot follow the form onto the next patient.
   */
  patientId?: string;
}

// The plain-path (built-in) patient form (spec/patients S3 Details; S2 step ③),
// shared by the create wizard's details step and the detail Details tab. The
// field set is FIXED here; on the document path the Details tab renders the
// patient document's form instead (domain/patient/documentFields.tsx, or a
// plugin's `patient.form`). All fields respect the disabled (permission /
// in-flight) state. Each control with behaviour of its own (the code
// generator, date of birth and age, gender, next of kin, deceased) is the
// shared one the document-path form also uses (domain/patient/
// PatientControls.tsx); this form maps them onto its own field bag. The plain
// path cannot store an estimated date of birth, so the date-of-birth control
// tracks it for the session.
export const PatientDetailsForm: Component<PatientDetailsFormProps> = props => {
  const errorFor = (id: string) => props.errorFor?.(id);

  return (
    <FormColumns>
      <FormColumn>
        <FormSection title={t('heading.patient-details')}>
          <PatientCodeControl
            storeId={props.storeId}
            patientId={props.patientId}
            value={props.draft.code}
            onChange={code => props.setField('code', code)}
            required
            error={errorFor('code')}
            disabled={props.disabled}
          />
          <TextField
            label={t('label.code2')}
            value={props.draft.code2}
            disabled={props.disabled}
            onInput={e => props.setField('code2', e.currentTarget.value)}
          />
          <TextField
            label={t('label.first-name')}
            required
            error={errorFor('firstName')}
            value={props.draft.firstName}
            disabled={props.disabled}
            onInput={e => props.setField('firstName', e.currentTarget.value)}
          />
          <TextField
            label={t('label.last-name')}
            required
            error={errorFor('lastName')}
            value={props.draft.lastName}
            disabled={props.disabled}
            onInput={e => props.setField('lastName', e.currentTarget.value)}
          />
          <DateOfBirthControl
            patientId={props.patientId}
            value={props.draft.dateOfBirth}
            onChange={dob => props.setField('dateOfBirth', dob)}
            disabled={props.disabled}
          />
          <GenderControl
            value={props.draft.gender}
            onChange={gender => props.setField('gender', gender)}
            disabled={props.disabled}
          />
        </FormSection>
      </FormColumn>
      <FormColumn>
        <FormSection title={t('label.contact')}>
          <TextField
            label={t('label.address')}
            value={props.draft.address1}
            disabled={props.disabled}
            onInput={e => props.setField('address1', e.currentTarget.value)}
          />
          <TextField
            label={t('label.phone')}
            value={props.draft.phone}
            disabled={props.disabled}
            onInput={e => props.setField('phone', e.currentTarget.value)}
          />
          <NextOfKinControl
            storeId={props.storeId}
            id={props.draft.nextOfKinId}
            name={props.draft.nextOfKinName}
            onChange={(id, name) => {
              props.setField('nextOfKinId', id);
              props.setField('nextOfKinName', name);
            }}
            disabled={props.disabled}
          />
        </FormSection>
        <FormSection title={t('label.status')}>
          <DeceasedControls
            isDeceased={props.draft.isDeceased}
            dateOfDeath={props.draft.dateOfDeath}
            onDeceasedChange={checked => props.setField('isDeceased', checked)}
            onDateOfDeathChange={date => props.setField('dateOfDeath', date)}
            disabled={props.disabled}
          />
        </FormSection>
      </FormColumn>
    </FormColumns>
  );
};
