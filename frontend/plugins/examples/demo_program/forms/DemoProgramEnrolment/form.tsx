/*
 * The demo program's enrolment form (kdd/custom-forms/implementation-plan.md
 * § The demo program; P2): contributed to `programEnrolment.form` for
 * `DemoProgramEnrolment`, so it is the body of the enrolment modal for this
 * type, on enrolling and on every later edit. The base enrolment fields, an
 * enrolment ID generated from the store and a server counter, the program's
 * own fields under `extension.demo`, and the two program events the server
 * derives from the patient's encounters, shown read-only.
 */
import { createSignal, type JSX } from 'solid-js';
import {
  Button,
  ConfirmDialog,
  DateInput,
  FieldGroup,
  FormColumn,
  FormRow,
  SelectInput,
  TextAreaInput,
  TextField,
  TextInput,
  allocateProgramNumber,
  slotContext,
  useActiveProgramEvents,
  type Draft,
  type ProgramEnrolmentFormProps,
} from '@openmsupply/plugin-sdk';
import { intl } from '../../intl';
import { regimenLabels } from '../DemoEncounter/labels';
import type { DemoRegimen } from '../DemoEncounter/type';
import { ENROLMENT_ID_COUNTER, formatEnrolmentId } from './enrolmentId';
import type { DemoProgramEnrolment, DemoReferralSource } from './type';

// Lines a button up with the input beside it rather than with that input's
// label, from the host's field tokens (as the host's own Generate button does).
const BESIDE_FIELD: JSX.CSSProperties = {
  'margin-block-start':
    'calc(var(--field-label-font-size) * var(--field-label-line-height) + var(--input-field-gap))',
};

/*
 * The enrolment ID and its Generate button: PNG's IdGenerator control
 * (store part + counter part, manual entry allowed) as plain code. Generating
 * into an empty field runs at once; replacing an ID the user can see asks
 * first, since it discards that ID and spends a counter value that is never
 * handed out again.
 */
const EnrolmentIdField = (props: {
  draft: Draft<DemoProgramEnrolment>;
}): JSX.Element => {
  const [generating, setGenerating] = createSignal(false);
  const [confirming, setConfirming] = createSignal(false);
  const storeCode = () => slotContext().storeCode;

  const generate = async () => {
    const code = storeCode();
    if (!code || generating()) return;
    setGenerating(true);
    const result = await allocateProgramNumber(ENROLMENT_ID_COUNTER);
    setGenerating(false);
    // A failure is already reported by the host; the field keeps its value.
    if (result.kind === 'success') {
      props.draft.set(
        'programEnrolmentId',
        formatEnrolmentId(code, result.data)
      );
    }
  };

  const onGenerate = () => {
    if (props.draft.get('programEnrolmentId')) setConfirming(true);
    else void generate();
  };

  return (
    <>
      <FormRow>
        <TextInput
          draft={props.draft}
          path="programEnrolmentId"
          label={intl.t('field.enrolment-id')}
          testId="demo-enrolment-id"
        />
        <Button
          variant="secondary"
          style={BESIDE_FIELD}
          loading={generating()}
          disabled={props.draft.readOnly() || !storeCode()}
          onClick={onGenerate}
          data-testid="demo-enrolment-id-generate"
        >
          {intl.t('button.generate')}
        </Button>
      </FormRow>
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={intl.t('heading.replace-enrolment-id')}
        message={intl.t('message.replace-enrolment-id', {
          id: props.draft.get('programEnrolmentId') ?? '',
        })}
        confirmLabel={intl.t('button.replace')}
        onConfirm={() => void generate()}
      />
    </>
  );
};

const referralLabels = (): Record<DemoReferralSource, string> => ({
  SELF: intl.t('referral.SELF'),
  CLINIC: intl.t('referral.CLINIC'),
  HOSPITAL: intl.t('referral.HOSPITAL'),
  COMMUNITY: intl.t('referral.COMMUNITY'),
});

// The event values as users read them. An event holds a string the rule
// wrote, so a value this form has no name for shows as written.
const regimenName = (value: string): string =>
  regimenLabels()[value as DemoRegimen] ?? value;
const followUpName = (value: string): string =>
  value === 'Due' || value === 'Overdue'
    ? intl.t(`follow-up.${value}`)
    : value;

export const DemoEnrolmentForm = (
  props: ProgramEnrolmentFormProps<DemoProgramEnrolment>
): JSX.Element => {
  // The events the encounters' rules (DemoEncounter/events.json) write for
  // this patient's enrolment. Read, never written: the server derives them on
  // every encounter save.
  const events = useActiveProgramEvents(() => ({
    patientId: props.record.patientId,
    documentType: 'DemoProgramEnrolment',
    types: ['currentRegimen', 'followUpStatus'],
  }));
  const eventValue = (type: string) =>
    events.data()?.find(e => e.type === type)?.data;

  return (
    <FormColumn>
      <FieldGroup title={intl.t('group.enrolment')} headingLevel="h3">
        <DateInput
          draft={props.draft}
          path="enrolmentDatetime"
          label={intl.t('field.enrolment-date')}
          testId="demo-enrolment-date"
        />
        <EnrolmentIdField draft={props.draft} />
        <SelectInput
          draft={props.draft}
          path="extension.demo.referredFrom"
          label={intl.t('field.referred-from')}
          options={referralLabels()}
          testId="demo-referred-from"
        />
        <TextAreaInput
          draft={props.draft}
          path="extension.demo.enrolmentNotes"
          label={intl.t('field.enrolment-notes')}
          rows={3}
          testId="demo-enrolment-notes"
        />
      </FieldGroup>
      <FieldGroup title={intl.t('group.program-status')} headingLevel="h3">
        <FormRow>
          <TextField
            label={intl.t('field.current-regimen')}
            value={regimenName(eventValue('currentRegimen') ?? '')}
            helperText={intl.t('helper.from-encounters')}
            disabled
            data-testid="demo-current-regimen"
          />
          <TextField
            label={intl.t('field.follow-up-status')}
            value={followUpName(eventValue('followUpStatus') ?? '')}
            helperText={intl.t('helper.from-encounters')}
            disabled
            data-testid="demo-follow-up-status"
          />
        </FormRow>
      </FieldGroup>
    </FormColumn>
  );
};
