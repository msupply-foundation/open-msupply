import { Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { Checkbox } from '../../../ui/elements/inputs/Checkbox';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import {
  PatientSearch,
  genderOptions,
  minimalPatientOption,
  type GenderOption,
} from '../../../domain/patient';
import { ageFromDob, type PatientDraft } from './patientEdit';

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
}

// The plain-path (built-in) patient form (spec/patients S3 Details; S2 step ③),
// shared by the create wizard's details step and the detail Details tab. The
// field set is FIXED here — the document-path schema-driven form is a separate,
// unbuilt surface (see the implementation flags). All fields respect the
// disabled (permission / in-flight) state. Date of death shows only when the
// patient is marked deceased (spec/patients field semantics). Age back-derives
// from date of birth, read-only.
export const PatientDetailsForm: Component<PatientDetailsFormProps> = props => {
  const today = localTodayIso();
  const errorFor = (id: string) => props.errorFor?.(id);
  const age = () => ageFromDob(props.draft.dateOfBirth);

  return (
    <FormColumns>
      <FormColumn>
        <FormSection title={t('heading.patient-details')}>
          <TextField
            label={t('label.code')}
            width="full"
            required
            error={errorFor('code')}
            value={props.draft.code}
            disabled={props.disabled}
            onInput={e => props.setField('code', e.currentTarget.value)}
          />
          <TextField
            label={t('label.code2')}
            width="full"
            value={props.draft.code2}
            disabled={props.disabled}
            onInput={e => props.setField('code2', e.currentTarget.value)}
          />
          <TextField
            label={t('label.first-name')}
            width="full"
            required
            error={errorFor('firstName')}
            value={props.draft.firstName}
            disabled={props.disabled}
            onInput={e => props.setField('firstName', e.currentTarget.value)}
          />
          <TextField
            label={t('label.last-name')}
            width="full"
            required
            error={errorFor('lastName')}
            value={props.draft.lastName}
            disabled={props.disabled}
            onInput={e => props.setField('lastName', e.currentTarget.value)}
          />
          <DateField
            label={t('label.date-of-birth')}
            width="full"
            max={today}
            value={props.draft.dateOfBirth}
            disabled={props.disabled}
            onChange={value => props.setField('dateOfBirth', value)}
          />
          <LabelledValue variant="field" label={t('label.age')}>
            {age() ?? '—'}
          </LabelledValue>
          <Combobox<GenderOption>
            label={t('label.gender')}
            items={genderOptions()}
            itemToString={o => o.label}
            itemToValue={o => o.value}
            value={props.draft.gender ?? undefined}
            disabled={props.disabled}
            onChange={o => props.setField('gender', o?.value ?? null)}
          />
        </FormSection>
      </FormColumn>
      <FormColumn>
        <FormSection title={t('label.contact')}>
          <TextField
            label={t('label.address')}
            width="full"
            value={props.draft.address1}
            disabled={props.disabled}
            onInput={e => props.setField('address1', e.currentTarget.value)}
          />
          <TextField
            label={t('label.phone')}
            width="full"
            value={props.draft.phone}
            disabled={props.disabled}
            onInput={e => props.setField('phone', e.currentTarget.value)}
          />
          <PatientSearch
            label={t('label.next-of-kin')}
            storeId={props.storeId}
            disabled={props.disabled}
            selected={
              props.draft.nextOfKinId
                ? minimalPatientOption(
                    props.draft.nextOfKinId,
                    props.draft.nextOfKinName
                  )
                : undefined
            }
            onSelect={patient => {
              props.setField('nextOfKinId', patient?.id ?? null);
              props.setField('nextOfKinName', patient?.name ?? '');
            }}
          />
        </FormSection>
        <FormSection title={t('label.status')}>
          <Checkbox
            label={t('label.deceased')}
            checked={props.draft.isDeceased}
            disabled={props.disabled}
            onChange={checked => props.setField('isDeceased', checked)}
          />
          <Show when={props.draft.isDeceased}>
            <DateField
              label={t('label.date-of-death')}
              width="full"
              max={today}
              value={props.draft.dateOfDeath}
              disabled={props.disabled}
              onChange={value => props.setField('dateOfDeath', value)}
            />
          </Show>
        </FormSection>
      </FormColumn>
    </FormColumns>
  );
};
