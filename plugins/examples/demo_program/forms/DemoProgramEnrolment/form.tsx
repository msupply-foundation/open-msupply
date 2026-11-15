/*
 * The demo program's enrolment form (kdd/custom-forms/implementation-plan.md
 * § The demo program; P2): contributed to `programEnrolment.form` for
 * `DemoProgramEnrolment`, so it is the body of the enrolment modal for this
 * type, on enrolling and on every later edit. The base enrolment fields, an
 * enrolment ID generated from the store and a server counter, the program's
 * own fields under `extension.demo`, and the two program events the server
 * derives from the patient's encounters, shown read-only.
 */
import type { JSX } from 'solid-js';
import {
  DateInput,
  EnrolmentIdField,
  FieldGroup,
  FormColumn,
  FormRow,
  SelectInput,
  TextAreaInput,
  TextField,
  allocateProgramNumber,
  slotContext,
  useActiveProgramEvents,
  type ProgramEnrolmentFormProps,
} from '@openmsupply/plugin-sdk';
import { intl } from '../../intl';
import { regimenLabelsV1 } from '../DemoEncounter/labels';
import type { DemoRegimenV1 } from '../DemoEncounter/v1';
import { ENROLMENT_ID_COUNTER, formatEnrolmentId } from './enrolmentId';
import type { DemoProgramEnrolment, DemoReferralSource } from './type';

/*
 * The demo program's ID format, for the host's enrolment ID field: the store's
 * code and the program's counter (`GRY-0042`). The field does the rest:
 * generating as a new enrolment opens, regenerating on request, skipping an
 * ID another enrolment holds, and typing (allowed here, as the old UI's
 * IdGenerator was configured).
 */
const generateEnrolmentId = async (): Promise<string | undefined> => {
  const code = slotContext().storeCode;
  if (!code) return undefined;
  const result = await allocateProgramNumber(ENROLMENT_ID_COUNTER);
  // A failure is already reported by the host.
  return result.kind === 'success'
    ? formatEnrolmentId(code, result.data)
    : undefined;
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
  regimenLabelsV1()[value as DemoRegimenV1] ?? value;
const followUpName = (value: string): string =>
  value === 'Due' || value === 'Overdue' ? intl.t(`follow-up.${value}`) : value;

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
        <EnrolmentIdField
          draft={props.draft}
          record={props.record}
          generate={generateEnrolmentId}
          allowTyping
          label={intl.t('field.enrolment-id')}
          testId="demo-enrolment-id"
        />
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
