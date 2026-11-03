/*
 * The demo program's patient form (kdd/custom-forms/implementation-plan.md
 * § The demo program; P2): contributed to `patient.form`, so it is the body
 * of the patient screen's Details tab. It composes the host's patient fields,
 * which carry the host's behaviour for each, with the program's own: its own
 * patient code in place of the host's, and two fields under `extension.demo`
 * beside the date of birth. The header, the tabs and the Save stay the
 * host's, and the host checks the base fields against the base Patient
 * schema before any save.
 */
import { createSignal, Show, type JSX } from 'solid-js';
import {
  Button,
  ConfirmDialog,
  FieldGroup,
  FormColumn,
  FormColumns,
  FormRow,
  FormSection,
  PatientAddressField,
  PatientCode2Field,
  PatientDateOfBirthField,
  PatientDeceasedFields,
  PatientFirstNameField,
  PatientGenderField,
  PatientLastNameField,
  PatientNextOfKinField,
  PatientPhoneField,
  SelectInput,
  TextInput,
  allocateProgramNumber,
  slotContext,
  type Draft,
  type PatientFormProps,
} from '@openmsupply/plugin-sdk';
import { intl } from '../../intl';
import {
  PATIENT_CODE_COUNTER,
  formatPatientCode,
  randomPart,
} from './patientCode';
import type { DemoPatient, DemoPreferredLanguage } from './type';

// Lines a button up with the input beside it rather than with that input's
// label, from the host's field tokens (as the host's own Generate button does).
const BESIDE_FIELD: JSX.CSSProperties = {
  'margin-block-start':
    'calc(var(--field-label-font-size) * var(--field-label-line-height) + var(--input-field-gap))',
};

/*
 * The patient code and its Generate button, in place of the host's code field
 * and generator. One counter value is spent per press, never on opening or
 * cancelling; replacing a code the user can see asks first. Drawing a number
 * needs the document-mutate permission, so without it the button is absent
 * and the code is typed by hand. The host checks the code is not another
 * patient's when the patient is saved.
 */
const DemoPatientCodeField = (props: {
  draft: Draft<DemoPatient>;
}): JSX.Element => {
  const [generating, setGenerating] = createSignal(false);
  const [confirming, setConfirming] = createSignal(false);
  const storeCode = () => slotContext().storeCode;
  const canDraw = () => slotContext().permissions.includes('DOCUMENT_MUTATE');

  const generate = async () => {
    const code = storeCode();
    if (!code || generating()) return;
    setGenerating(true);
    const result = await allocateProgramNumber(PATIENT_CODE_COUNTER);
    setGenerating(false);
    // A failure is already reported by the host; the field keeps its value.
    if (result.kind === 'success') {
      props.draft.set(
        'code',
        formatPatientCode(code, randomPart(), result.data)
      );
    }
  };

  const onGenerate = () => {
    if (props.draft.get('code')) setConfirming(true);
    else void generate();
  };

  return (
    <>
      <FormRow>
        <TextInput
          draft={props.draft}
          path="code"
          label={intl.t('field.patient-code')}
          testId="demo-patient-code"
        />
        <Show when={canDraw()}>
          <Button
            variant="secondary"
            style={BESIDE_FIELD}
            loading={generating()}
            disabled={props.draft.readOnly() || !storeCode()}
            onClick={onGenerate}
            data-testid="demo-patient-code-generate"
          >
            {intl.t('button.generate')}
          </Button>
        </Show>
      </FormRow>
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={intl.t('heading.replace-patient-code')}
        message={intl.t('message.replace-patient-code', {
          code: props.draft.get('code') ?? '',
        })}
        confirmLabel={intl.t('button.replace')}
        onConfirm={() => void generate()}
      />
    </>
  );
};

const languageLabels = (): Record<DemoPreferredLanguage, string> => ({
  ENGLISH: intl.t('language.ENGLISH'),
  FRENCH: intl.t('language.FRENCH'),
  SPANISH: intl.t('language.SPANISH'),
  OTHER: intl.t('language.OTHER'),
});

export const DemoPatientForm = (
  props: PatientFormProps<DemoPatient>
): JSX.Element => (
  <FormColumns>
    <FormColumn>
      <FormSection title={intl.t('group.patient-details')}>
        <DemoPatientCodeField draft={props.draft} />
        <PatientCode2Field draft={props.draft} />
        <PatientFirstNameField draft={props.draft} />
        <PatientLastNameField draft={props.draft} />
        <PatientDateOfBirthField draft={props.draft} />
        <FieldGroup title={intl.t('group.demo-details')} headingLevel="h3">
          <TextInput
            draft={props.draft}
            path="extension.demo.treatmentSupporter"
            label={intl.t('field.treatment-supporter')}
            testId="demo-treatment-supporter"
          />
          <SelectInput
            draft={props.draft}
            path="extension.demo.preferredLanguage"
            label={intl.t('field.preferred-language')}
            options={languageLabels()}
            testId="demo-preferred-language"
          />
        </FieldGroup>
        <PatientGenderField draft={props.draft} />
      </FormSection>
    </FormColumn>
    <FormColumn>
      <FormSection title={intl.t('group.contact')}>
        <PatientAddressField draft={props.draft} />
        <PatientPhoneField draft={props.draft} />
        <PatientNextOfKinField draft={props.draft} />
      </FormSection>
      <FormSection title={intl.t('group.status')}>
        <PatientDeceasedFields draft={props.draft} />
      </FormSection>
    </FormColumn>
  </FormColumns>
);
