import { createSignal, Show, type JSX } from 'solid-js';
import { t } from '../../intl';
import { FormRow } from '../../ui/layout/Form/FormRow';
import { TextField } from '../../ui/elements/inputs/TextField';
import { DateField } from '../../ui/elements/inputs/DateField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { localTodayIso } from '../../ui/elements/inputs/dateTimeConvert';
import { Checkbox } from '../../ui/elements/inputs/Checkbox';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { InfoTooltip } from '../../ui/elements/feedback/InfoTooltip';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { Button } from '../../ui/elements/buttons/Button';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import { currentStoreName } from '../../store/storeContext';
import { PatientSearch } from './PatientSearch';
import { minimalPatientOption } from './patientResource';
import {
  genderLabel,
  genderOptions,
  type Gender,
  type GenderOption,
} from './gender';
import { generatePatientCode } from './patientCode';
import { ageFromDob, ageMonthsAndDays, dobFromAge } from './age';
import styles from './PatientControls.module.css';

/*
 * The patient form's controls (spec/patients S3 Details; S2 step ③), each over
 * a value and a change callback so that both of the host's patient forms
 * share one implementation: the plain-path form over its own field bag
 * (sections/patients/detail/PatientDetailsForm.tsx), and the document-path
 * fields over the patient document's draft (./documentFields.tsx), which
 * plugin forms compose too. The behaviour spec/patients defines for a field
 * lives here, so the two forms cannot drift apart on it.
 */

// Upper bound on a typed age, so a slip can't mint a nonsense birth year (the
// date-of-birth field is bounded by today at the other end).
const MAX_AGE = 150;

export interface PatientCodeControlProps {
  storeId: string;
  /**
   * The patient being edited (the minted id while creating): its own code is
   * not a collision when the generator checks whether a candidate is held.
   */
  patientId?: string;
  value: string;
  onChange: (code: string) => void;
  /** The field's label, already translated; the host's own when absent. */
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

/**
 * The code and its Generate button (spec/patients § generating a code). No
 * permission gate of its own: allocatePatientNumber costs PATIENT_MUTATE, the
 * very thing `disabled` already carries, so the button rides the form's own
 * state (#268). A read-only viewer gets the button disabled rather than
 * absent, like every other control on the form — the shortcut is unavailable
 * for exactly the reason the field itself is.
 */
export const PatientCodeControl = (
  props: PatientCodeControlProps
): JSX.Element => {
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
    if (code) props.onChange(code);
  };

  // Re-generating discards a code the user can see AND consumes a counter value
  // that is never handed out again, so it asks first. Generating into an empty
  // field has nothing to lose and runs straight away.
  const onGenerate = () => {
    if (props.value.trim()) setConfirmRegenerate(true);
    else void generate();
  };

  return (
    <>
      <FormRow>
        <TextField
          label={props.label ?? t('label.code')}
          required={props.required}
          error={props.error}
          value={props.value}
          disabled={props.disabled}
          onInput={e => props.onChange(e.currentTarget.value)}
        />
        <Button
          class={styles.generate}
          variant="secondary"
          disabled={props.disabled}
          loading={generating()}
          onClick={onGenerate}
        >
          {t('label.generate')}
        </Button>
      </FormRow>
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

export interface DateOfBirthControlProps {
  /**
   * Scopes the estimated mark, so it cannot follow the form onto another
   * patient.
   */
  patientId?: string;
  value: string | null;
  /**
   * Whether the date of birth is estimated, where the record keeps it (the
   * patient document's `dateOfBirthIsEstimated`). Absent on the plain path,
   * which cannot store it: the mark then shows while the date is the one this
   * session's age entry produced.
   */
  estimated?: boolean;
  /** `fromAge` is true when the date was back-filled from a typed age. */
  onChange: (dob: string | null, fromAge: boolean) => void;
  /**
   * The date of birth's label, already translated; the host's own when
   * absent. The age beside it keeps the host's.
   */
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  /** `data-testid` for the date; the age takes it with `-age` added. */
  testId?: string;
}

/**
 * Date of birth with age beside it, editable in both directions (spec/patients
 * rules › age): age derives from an entered date of birth, and typing one
 * back-fills a start-of-year date of birth. An age entry hangs an info tooltip
 * off the date-of-birth label saying the date is estimated (DIS-02 `.4`).
 */
export const DateOfBirthControl = (
  props: DateOfBirthControlProps
): JSX.Element => {
  const today = localTodayIso();
  const age = () => ageFromDob(props.value);

  // Which date of birth an age entry produced, and on which patient. It
  // reports only while the control still holds THAT value for THAT patient,
  // so a discard, a re-seed onto another patient, or a date entered directly
  // all drop it without being told — the value simply stops matching.
  const [ageSource, setAgeSource] = createSignal<{
    patientId?: string;
    dob: string;
  }>();

  const dobFromAgeEntry = () => {
    const source = ageSource();
    return (
      source !== undefined &&
      source.dob === props.value &&
      source.patientId === props.patientId
    );
  };

  const estimated = () => props.estimated ?? dobFromAgeEntry();

  // Under a year old the age is shown as months and days, and can only be READ
  // — the years box has no way to take that value back (spec/patients rules ›
  // age). Not while an age entry is the source of that date, though: swapping
  // the control out from under an entry of `0` would take the focus with it,
  // and leave no way back to the field short of clearing the date of birth.
  const monthsAndDays = () =>
    dobFromAgeEntry() ? undefined : ageMonthsAndDays(props.value);

  return (
    <FormRow>
      <DateField
        label={props.label ?? t('label.date-of-birth')}
        max={today}
        value={props.value}
        required={props.required}
        error={props.error}
        disabled={props.disabled}
        testId={props.testId}
        // The Show goes INSIDE the slot, so labelInfo is always present and
        // only the tooltip mounts/unmounts. Toggling the slot itself between
        // an element and undefined would also swap the label between
        // FieldShell's bare and label-row branches on every keystroke that
        // starts or clears an age.
        labelInfo={
          <Show when={estimated()}>
            <InfoTooltip
              text={t('messages.dob-estimated-from-age')}
              triggerTestId="dob-estimated-info"
            />
          </Show>
        }
        onChange={value => {
          setAgeSource(undefined);
          props.onChange(value, false);
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
            data-testid={props.testId && `${props.testId}-age`}
            onChange={value => {
              const dob = value === undefined ? null : dobFromAge(value);
              setAgeSource(
                dob === null ? undefined : { patientId: props.patientId, dob }
              );
              props.onChange(dob, dob !== null);
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
  );
};

export interface GenderControlProps {
  value: Gender | null;
  onChange: (gender: Gender | null) => void;
  /** The field's label, already translated; the host's own when absent. */
  label?: string;
  error?: string;
  disabled?: boolean;
}

/** Gender, from the store's configured subset (spec/patients § gender). */
export const GenderControl = (props: GenderControlProps): JSX.Element => (
  <Combobox<GenderOption>
    label={props.label ?? t('label.gender')}
    items={genderOptions()}
    itemToString={o => o.label}
    itemToValue={o => o.value}
    value={props.value ?? undefined}
    selectedItem={
      props.value
        ? { value: props.value, label: genderLabel(props.value) }
        : undefined
    }
    error={props.error}
    disabled={props.disabled}
    onChange={o => props.onChange(o?.value ?? null)}
  />
);

export interface NextOfKinControlProps {
  storeId: string;
  id: string | null;
  name: string;
  onChange: (id: string | null, name: string) => void;
  /** The field's label, already translated; the host's own when absent. */
  label?: string;
  disabled?: boolean;
}

/** The next of kin, picked from the store's patients. */
export const NextOfKinControl = (props: NextOfKinControlProps): JSX.Element => (
  <PatientSearch
    label={props.label ?? t('label.next-of-kin')}
    storeId={props.storeId}
    disabled={props.disabled}
    selected={props.id ? minimalPatientOption(props.id, props.name) : undefined}
    onSelect={patient =>
      props.onChange(patient?.id ?? null, patient?.name ?? '')
    }
  />
);

export interface DeceasedControlsProps {
  isDeceased: boolean;
  dateOfDeath: string | null;
  onDeceasedChange: (deceased: boolean) => void;
  onDateOfDeathChange: (date: string | null) => void;
  error?: string;
  disabled?: boolean;
}

/** Deceased, with the date of death shown only while it is ticked. */
export const DeceasedControls = (props: DeceasedControlsProps): JSX.Element => (
  <>
    <Checkbox
      label={t('label.deceased')}
      checked={props.isDeceased}
      disabled={props.disabled}
      onChange={props.onDeceasedChange}
    />
    <Show when={props.isDeceased}>
      <DateField
        label={t('label.date-of-death')}
        max={localTodayIso()}
        value={props.dateOfDeath}
        error={props.error}
        disabled={props.disabled}
        onChange={props.onDateOfDeathChange}
      />
    </Show>
  </>
);
