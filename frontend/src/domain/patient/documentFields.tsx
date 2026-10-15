/*
 * The host's patient fields over a patient document's draft (kdd/custom-forms/
 * specs.md § Host-owned surfaces, Patient): one component per field of the
 * host's patient form, each binding a shared control (./PatientControls.tsx)
 * to where the base Patient type keeps its value. A plugin's `patient.form`
 * composes them beside its own fields, through the SDK's lazy wrappers, and
 * `DefaultPatientForm` below lays them out as the Details tab shows them when
 * no plugin form is contributed.
 *
 * Each takes the draft of any Patient type, so a plugin's own type (which
 * extends the base) fits. Required marks and errors come from the draft, so
 * they follow the installed schema: the document path's required fields are
 * the schema's, not the plain path's fixed rule (spec/patients rules › two
 * persistence paths).
 *
 * Address and phone live in the first contact block (`contactDetails[0]`),
 * the one the server projects onto the patient record. A form reaches its
 * other fields with the form library on their first-item paths
 * (`contactDetails.0.region`).
 */
import type { JSX } from 'solid-js';
import { t } from '../../intl';
import { FormColumns } from '../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../ui/layout/Form/FormColumn';
import { FormSection } from '../../ui/layout/Form/FormSection';
import { TextField } from '../../ui/elements/inputs/TextField';
import { currentStoreId } from '../../store/storeContext';
import type { Patient } from '../../plugin-sdk/documents';
import type { Draft } from '../documentForm/draft';
import {
  DateOfBirthControl,
  DeceasedControls,
  GenderControl,
  NextOfKinControl,
  PatientCodeControl,
} from './PatientControls';
import { withFirstContact, type ContactField } from './contactDetails';

/** What every patient field takes: the draft, and an optional disable. */
export interface PatientFieldProps<T extends Patient = Patient> {
  draft: Draft<T>;
  /** Disables the field whatever the draft's read-only state. */
  disabled?: boolean;
}

/**
 * A patient field with one label, which a plugin may word its own way (a
 * deployment's "2ème nom" for the last name); the host's label when absent.
 */
export interface LabelledPatientFieldProps<
  T extends Patient = Patient,
> extends PatientFieldProps<T> {
  /** The field's label, already translated. */
  label?: string;
}

// Every field reads the base Patient's paths, which any plugin's Patient type
// has because it extends the base.
const base = <T extends Patient>(draft: Draft<T>) =>
  draft as unknown as Draft<Patient>;

const disabled = (field: {
  disabled?: boolean;
  draft: { readOnly(): boolean };
}) => field.disabled === true || field.draft.readOnly();

const required = (draft: Draft<Patient>, path: 'code' | 'code2') =>
  draft.schemaFor(path)?.required ?? false;

/**
 * The patient code, with the host's generator beside it where the codes it
 * makes fit the schema's pattern for the code.
 */
export const PatientCodeField = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => {
  const d = () => base(props.draft);
  return (
    <PatientCodeControl
      label={props.label}
      storeId={currentStoreId() ?? ''}
      patientId={d().data.id}
      value={d().data.code ?? ''}
      onChange={code => d().set('code', code || undefined)}
      required={required(d(), 'code')}
      pattern={d().schemaFor('code')?.pattern}
      error={d().errorFor('code')}
      disabled={disabled(props)}
      testId="patient-code"
    />
  );
};

/** The secondary patient code. */
export const PatientCode2Field = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => {
  const d = () => base(props.draft);
  return (
    <TextField
      label={props.label ?? t('label.code2')}
      value={d().data.code2 ?? ''}
      onInput={e => d().set('code2', e.currentTarget.value || undefined)}
      required={required(d(), 'code2')}
      error={d().errorFor('code2')}
      disabled={disabled(props)}
    />
  );
};

/** First name, which the base Patient requires. */
export const PatientFirstNameField = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => {
  const d = () => base(props.draft);
  return (
    <TextField
      label={props.label ?? t('label.first-name')}
      value={d().data.firstName ?? ''}
      // A cleared box removes the property, as the form library's text
      // fields do, so the schema's required refuses an empty name; an empty
      // string would pass a schema that only says `type: string`.
      onInput={e => d().set('firstName', e.currentTarget.value || undefined)}
      required
      error={d().errorFor('firstName')}
      disabled={disabled(props)}
      data-testid="patient-first-name"
    />
  );
};

/** Last name, which the base Patient requires. */
export const PatientLastNameField = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => {
  const d = () => base(props.draft);
  return (
    <TextField
      label={props.label ?? t('label.last-name')}
      value={d().data.lastName ?? ''}
      // Cleared, removed, as the first name is.
      onInput={e => d().set('lastName', e.currentTarget.value || undefined)}
      required
      error={d().errorFor('lastName')}
      disabled={disabled(props)}
      data-testid="patient-last-name"
    />
  );
};

/**
 * Date of birth with age beside it. An age entry stores the start of that
 * year and marks the date estimated (`dateOfBirthIsEstimated`); a date
 * entered directly clears the mark.
 */
export const PatientDateOfBirthField = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => {
  const d = () => base(props.draft);
  return (
    <DateOfBirthControl
      label={props.label}
      patientId={d().data.id}
      value={d().data.dateOfBirth ?? null}
      estimated={d().data.dateOfBirthIsEstimated === true}
      onChange={(dob, fromAge) => {
        d().set('dateOfBirth', dob ?? undefined);
        d().set('dateOfBirthIsEstimated', fromAge || undefined);
      }}
      error={d().errorFor('dateOfBirth')}
      disabled={disabled(props)}
    />
  );
};

/** Gender, from the store's configured subset. */
export const PatientGenderField = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => {
  const d = () => base(props.draft);
  return (
    <GenderControl
      label={props.label}
      value={d().data.gender ?? null}
      onChange={gender => d().set('gender', gender ?? undefined)}
      error={d().errorFor('gender')}
      disabled={disabled(props)}
    />
  );
};

const ContactTextField = (props: {
  draft: Draft<Patient>;
  field: ContactField;
  label: string;
  disabled: boolean;
}): JSX.Element => (
  <TextField
    label={props.label}
    value={props.draft.data.contactDetails?.[0]?.[props.field] ?? ''}
    onInput={e =>
      props.draft.set(
        'contactDetails',
        withFirstContact(
          props.draft.data.contactDetails,
          props.field,
          e.currentTarget.value || undefined
        )
      )
    }
    disabled={props.disabled}
  />
);

/** The address, in the first contact block. */
export const PatientAddressField = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => (
  <ContactTextField
    draft={base(props.draft)}
    field="address1"
    label={props.label ?? t('label.address')}
    disabled={disabled(props)}
  />
);

/** The phone number, in the first contact block. */
export const PatientPhoneField = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => (
  <ContactTextField
    draft={base(props.draft)}
    field="phone"
    label={props.label ?? t('label.phone')}
    disabled={disabled(props)}
  />
);

/** The next of kin, picked from the store's patients. */
export const PatientNextOfKinField = <T extends Patient>(
  props: LabelledPatientFieldProps<T>
): JSX.Element => {
  const d = () => base(props.draft);
  return (
    <NextOfKinControl
      label={props.label}
      storeId={currentStoreId() ?? ''}
      id={d().data.nextOfKin?.id ?? null}
      name={d().data.nextOfKin?.name ?? ''}
      onChange={(id, name) =>
        d().set('nextOfKin', id ? { id, name } : undefined)
      }
      disabled={disabled(props)}
    />
  );
};

/** Deceased, with the date of death while it is ticked. */
export const PatientDeceasedFields = <T extends Patient>(
  props: PatientFieldProps<T>
): JSX.Element => {
  const d = () => base(props.draft);
  return (
    <DeceasedControls
      isDeceased={d().data.isDeceased === true}
      dateOfDeath={d().data.dateOfDeath ?? null}
      onDeceasedChange={deceased => {
        d().set('isDeceased', deceased);
        // A date of death only belongs to a patient marked deceased, as the
        // plain path sends it.
        if (!deceased) d().set('dateOfDeath', undefined);
      }}
      onDateOfDeathChange={date => d().set('dateOfDeath', date ?? undefined)}
      error={d().errorFor('dateOfDeath')}
      disabled={disabled(props)}
    />
  );
};

/**
 * The Details tab's form on the document path when no plugin form is
 * contributed: the host's fields in the plain-path form's layout. Fields of
 * the document it does not render stay in the draft, untouched.
 */
export const DefaultPatientForm = (
  props: PatientFieldProps<Patient>
): JSX.Element => (
  <FormColumns>
    <FormColumn>
      <FormSection title={t('heading.patient-details')}>
        <PatientCodeField draft={props.draft} />
        <PatientCode2Field draft={props.draft} />
        <PatientFirstNameField draft={props.draft} />
        <PatientLastNameField draft={props.draft} />
        <PatientDateOfBirthField draft={props.draft} />
        <PatientGenderField draft={props.draft} />
      </FormSection>
    </FormColumn>
    <FormColumn>
      <FormSection title={t('label.contact')}>
        <PatientAddressField draft={props.draft} />
        <PatientPhoneField draft={props.draft} />
        <PatientNextOfKinField draft={props.draft} />
      </FormSection>
      <FormSection title={t('label.status')}>
        <PatientDeceasedFields draft={props.draft} />
      </FormSection>
    </FormColumn>
  </FormColumns>
);
