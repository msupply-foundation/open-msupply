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
  genderOptions,
  minimalPatientOption,
  type GenderOption,
} from '../../../domain/patient';
import { currentStoreName, hasPermission } from '../../../store/storeContext';
import { generatePatientCode } from '../patientCode';
import { ageFromDob, dobFromAge, type PatientDraft } from './patientEdit';
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
   * The creation flow (the create wizard's details step) rather than editing a
   * saved patient. ONLY then does the form note that a date of birth was
   * estimated from a typed age: the flag is a live property of this editing
   * session, not of the record (the wire input carries no such field), so on an
   * existing patient there is nothing to know — the stored date says nothing
   * about how it was captured, and a hint would be a guess.
   */
  creating?: boolean;
  /**
   * The patient being edited, when there is one. Only the code generator uses
   * it — a patient's own code is not a collision when the generator checks
   * whether a candidate code is already held (spec/patients § generating a
   * code).
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
// there is no second source of truth to keep in step. While CREATING, an age
// entry also hangs an info tooltip off the date-of-birth label saying that date
// is estimated — on the field whose value is the approximate one.
export const PatientDetailsForm: Component<PatientDetailsFormProps> = props => {
  const today = localTodayIso();
  const errorFor = (id: string) => props.errorFor?.(id);
  const age = () => ageFromDob(props.draft.dateOfBirth);

  // Was the current date of birth typed as an age? Session-only, and only asked
  // during creation (see `creating`) — set when an age is entered, cleared as
  // soon as a real date replaces it or the age is emptied.
  const [dobEstimated, setDobEstimated] = createSignal(false);
  const showEstimatedHint = () => !!props.creating && dobEstimated();

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
                width="full"
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
            <FormRow>
              <DateField
                label={t('label.date-of-birth')}
                width="full"
                max={today}
                value={props.draft.dateOfBirth}
                disabled={props.disabled}
                // The Show goes INSIDE the slot, so labelInfo is always present
                // and only the tooltip mounts/unmounts. Toggling the slot itself
                // between an element and undefined would also swap the label
                // between FieldShell's bare and label-row branches on every
                // keystroke that starts or clears an age.
                labelInfo={
                  <Show when={showEstimatedHint()}>
                    <InfoTooltip
                      text={t('messages.dob-estimated-from-age')}
                      triggerTestId="dob-estimated-info"
                    />
                  </Show>
                }
                onChange={value => {
                  setDobEstimated(false);
                  props.setField('dateOfBirth', value);
                }}
              />
              <NumberField
                label={t('label.age')}
                width="full"
                max={MAX_AGE}
                value={age()}
                disabled={props.disabled}
                onChange={value => {
                  setDobEstimated(value !== undefined);
                  props.setField(
                    'dateOfBirth',
                    value === undefined ? null : dobFromAge(value)
                  );
                }}
              />
            </FormRow>
            <Combobox<GenderOption>
              label={t('label.gender')}
              width="full"
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
