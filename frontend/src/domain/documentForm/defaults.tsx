/*
 * The host's default forms for the base types (kdd/custom-forms/specs.md §
 * Forms in the UI; implementation-plan H6): what an enrolment or encounter
 * renders when no plugin form exists for its document type. A program with
 * no plugin, or one whose plugin is not written yet, still enrols patients
 * and records encounters through these.
 *
 * They edit only base-type fields, so they work for every document type of
 * their category, and a type's own extension fields are left in the document
 * untouched. Written with the form library a plugin form uses: these are the
 * first forms on it.
 */
import type { JSX } from 'solid-js';
import { t } from '../../intl';
import { authUser, userDisplayName } from '../../auth/authContext';
import { TextArea } from '../../ui/elements/inputs/TextArea';
import { Stack } from '../../ui/layout/Stack/Stack';
import type {
  Encounter,
  Note,
  ProgramEnrolment,
} from '../../plugin-sdk/documents';
import type { Draft } from './draft';
import { DateInput, DateTimeInput, TextInput } from './fields';
import { withFirstNoteText } from './notes';

interface NoteBoxProps {
  label: string;
  notes: readonly Note[] | undefined;
  onChange: (notes: Note[] | undefined) => void;
  disabled: boolean;
  testId: string;
}

// One free-text note over the document's notes list (see withFirstNoteText).
const NoteBox = (props: NoteBoxProps): JSX.Element => (
  <TextArea
    label={props.label}
    rows={3}
    value={props.notes?.[0]?.text ?? ''}
    onInput={e =>
      props.onChange(
        withFirstNoteText(
          props.notes,
          e.currentTarget.value,
          { id: authUser()?.userId, name: userDisplayName() },
          new Date().toISOString()
        )
      )
    }
    disabled={props.disabled}
    data-testid={props.testId}
  />
);

export interface DefaultFormProps<T> {
  draft: Draft<T>;
}

/** The enrolment form for any ProgramEnrolment type without a plugin form. */
export const DefaultEnrolmentForm = (
  props: DefaultFormProps<ProgramEnrolment>
): JSX.Element => (
  <Stack>
    <DateInput
      draft={props.draft}
      path="enrolmentDatetime"
      label={t('label.enrolment-datetime')}
      testId="enrolment-datetime"
    />
    <TextInput
      draft={props.draft}
      path="programEnrolmentId"
      label={t('label.enrolment-patient-id')}
      testId="enrolment-patient-id"
    />
    <NoteBox
      label={t('label.notes')}
      notes={props.draft.data.notes}
      onChange={notes => props.draft.set('notes', notes)}
      disabled={props.draft.readOnly()}
      testId="enrolment-notes"
    />
  </Stack>
);

/*
 * The encounter form body for any Encounter type without a plugin form. The
 * record screen's toolbar owns visit date, clinician and status, so the body
 * holds the base fields left over.
 */
export const DefaultEncounterForm = (
  props: DefaultFormProps<Encounter>
): JSX.Element => (
  <Stack>
    <DateTimeInput
      draft={props.draft}
      path="endDatetime"
      label={t('label.end-datetime')}
      testId="encounter-end-datetime"
    />
    <NoteBox
      label={t('label.visit-notes')}
      notes={props.draft.data.notes}
      onChange={notes => props.draft.set('notes', notes)}
      disabled={props.draft.readOnly()}
      testId="encounter-notes"
    />
  </Stack>
);
