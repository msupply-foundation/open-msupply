import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { FormRow } from '../../../ui/layout/Form/FormRow';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { Checkbox } from '../../../ui/elements/inputs/Checkbox';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Button } from '../../../ui/elements/buttons/Button';
import {
  PatientSearch,
  genderLabel,
  genderOptions,
  minimalPatientOption,
  type GenderOption,
} from '../../../domain/patient';
import { currentStoreName, hasPermission } from '../../../store/storeContext';
import { generatePatientCode } from '../patientCode';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import {
  ageFromDob,
  ageMonthsAndDays,
  dobFromAge,
  type PatientDraft,
} from './patientEdit';
import styles from './PatientDetailsForm.module.css';

// Upper bound on a typed age, so a slip can't mint a nonsense birth year (the
// date-of-birth field is bounded by today at the other end).
const MAX_AGE = 150;

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
// field set is FIXED here — the document-path schema-driven form is a separate,
// unbuilt surface (see the implementation flags). All fields respect the
// disabled (permission / in-flight) state. Date of death shows only when the
// patient is marked deceased (spec/patients field semantics). Age sits beside
// date of birth and is EDITABLE in both directions: it derives from an entered
// date of birth, and typing one back-fills a start-of-year date of birth
// (spec/patients rules › age) — the two share the single dateOfBirth field, so
// there is no second source of truth to keep in step. An age entry also hangs
// an info tooltip off the date-of-birth label saying that date is estimated —
// on the field whose value is the approximate one, on create and edit alike
// (DIS-02 `.4`).
export const PatientDetailsForm: Component<PatientDetailsFormProps> = props => {
  const today = localTodayIso();
  const errorFor = (id: string) => props.errorFor?.(id);
  const age = () => ageFromDob(props.draft.dateOfBirth);

  // Which date of birth an age entry produced, and on which patient. The mark
  // reports only while the form still holds THAT value for THAT patient (the
  // createCodeTakenCheck pattern), so a discard, a re-seed onto another
  // patient, or a date entered directly all drop it without being told — the
  // value simply stops matching. Session-scoped by construction: nothing about
  // it is saved, and the wire input carries no such field (spec/patients rules
  // › age).
  const [ageSource, setAgeSource] = createSignal<{
    patientId?: string;
    dob: string;
  }>();

  const dobFromAgeEntry = () => {
    const source = ageSource();
    return (
      source !== undefined &&
      source.dob === props.draft.dateOfBirth &&
      source.patientId === props.patientId
    );
  };

  // Under a year old the age is shown as months and days, and can only be READ
  // — the years box has no way to take that value back (spec/patients rules ›
  // age). Not while the age entry is the source of that date, though: swapping
  // the control out from under an entry of `0` would take the focus with it,
  // and leave no way back to the field short of clearing the date of birth.
  const monthsAndDays = () =>
    dobFromAgeEntry() ? undefined : ageMonthsAndDays(props.draft.dateOfBirth);

  // The code generator (spec/patients § generating a code). Gated on
  // DOCUMENT_MUTATE, NOT the patient-mutate permission gating the rest of the
  // form: the counter behind it is a program-number allocation (contract › wire
  // trap), so a patient-mutate-only user would just get Forbidden. Without the
  // permission the field is still typeable — only the shortcut is missing.
  const [generating, setGenerating] = createSignal(false);
  const [confirmRegenerate, setConfirmRegenerate] = createSignal(false);

  const generate = async () => {
    const storeName = currentStoreName();
    if (!storeName || generating()) return;
    setGenerating(true);
    const code = await generatePatientCode(
      props.storeId,
      storeName,
      props.patientId
    );
    setGenerating(false);
    // Undefined = the counter was unreachable; the failure is already surfaced
    // globally, so leave the field as the user left it rather than blanking it.
    if (code) props.setField('code', code);
  };

  // Re-generating discards a code the user can see AND consumes a counter value
  // that is never handed out again, so it asks first. Generating into an empty
  // field has nothing to lose and runs straight away.
  const onGenerate = () => {
    if (props.draft.code.trim()) setConfirmRegenerate(true);
    else void generate();
  };

  return (
    <>
      <FormColumns>
        <FormColumn>
          <FormSection title={t('heading.patient-details')}>
            {/* Code + its Generate button share a row. Without the permission
                the button is absent and the field simply keeps the whole row —
                a dead control would suggest the shortcut is merely unavailable
                right now, when the user can never have it. */}
            <FormRow>
              <TextField
                label={t('label.code')}
                required
                error={errorFor('code')}
                value={props.draft.code}
                disabled={props.disabled}
                onInput={e => props.setField('code', e.currentTarget.value)}
              />
              <Show when={hasPermission('DOCUMENT_MUTATE')}>
                <Button
                  class={styles.generate}
                  variant="secondary"
                  disabled={props.disabled}
                  loading={generating()}
                  onClick={onGenerate}
                >
                  {t('label.generate')}
                </Button>
              </Show>
            </FormRow>
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
            <FormRow>
              <DateField
                label={t('label.date-of-birth')}
                max={today}
                value={props.draft.dateOfBirth}
                disabled={props.disabled}
                // The Show goes INSIDE the slot, so labelInfo is always present
                // and only the tooltip mounts/unmounts. Toggling the slot
                // itself between an element and undefined would also swap the
                // label between FieldShell's bare and label-row branches on
                // every keystroke that starts or clears an age.
                labelInfo={
                  <Show when={dobFromAgeEntry()}>
                    <InfoTooltip
                      text={t('messages.dob-estimated-from-age')}
                      triggerTestId="dob-estimated-info"
                    />
                  </Show>
                }
                onChange={value => {
                  setAgeSource(undefined);
                  props.setField('dateOfBirth', value);
                }}
              />
              <Show
                when={monthsAndDays()}
                fallback={
                  <NumberField
                    label={t('label.age')}
                    max={MAX_AGE}
                    value={age()}
                    disabled={props.disabled}
                    onChange={value => {
                      const dob =
                        value === undefined ? null : dobFromAge(value);
                      setAgeSource(
                        dob === null
                          ? undefined
                          : { patientId: props.patientId, dob }
                      );
                      props.setField('dateOfBirth', dob);
                    }}
                  />
                }
              >
                {display => (
                  <LabelledValue label={t('label.age')} variant="field">
                    {display()}
                  </LabelledValue>
                )}
              </Show>
            </FormRow>
            <Combobox<GenderOption>
              label={t('label.gender')}
              items={genderOptions()}
              itemToString={o => o.label}
              itemToValue={o => o.value}
              value={props.draft.gender ?? undefined}
              selectedItem={
                props.draft.gender
                  ? {
                      value: props.draft.gender,
                      label: genderLabel(props.draft.gender),
                    }
                  : undefined
              }
              disabled={props.disabled}
              onChange={o => props.setField('gender', o?.value ?? null)}
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
                max={today}
                value={props.draft.dateOfDeath}
                disabled={props.disabled}
                onChange={value => props.setField('dateOfDeath', value)}
              />
            </Show>
          </FormSection>
        </FormColumn>
      </FormColumns>
      <ConfirmDialog
        open={confirmRegenerate()}
        onClose={() => setConfirmRegenerate(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.regenerate-id-confirm')}
        onConfirm={() => void generate()}
      />
    </>
  );
};
