/*
 * The host's default forms for the base types (kdd/custom-forms/specs.md §
 * Forms in the UI): what an enrolment or encounter renders when no plugin form
 * exists for its document type. A program with no plugin, or one whose plugin
 * is not written yet, still enrols patients and records encounters through
 * these.
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
import { nameFieldInSummary, type Draft } from './draft';
import type { FormRegistryFragment } from './documentForm.generated';
import { DateInput, DateTimeInput, TextInput } from './fields';
import { withFirstNoteText } from './notes';
import type { JsonSchema } from './schemaNode';
import { validateDocument } from './validation';

interface NoteBoxProps {
  draft: unknown;
  path: string;
  label: string;
  notes: readonly Note[] | undefined;
  onChange: (notes: Note[] | undefined) => void;
  disabled: boolean;
  testId: string;
}

// One free-text note over the document's notes list (see withFirstNoteText).
// Named to the draft as every field is, so the host knows the form renders
// the notes itself (the encounter panel's own Notes box then stands down).
const NoteBox = (props: NoteBoxProps): JSX.Element => {
  nameFieldInSummary(props);
  return (
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
};

export interface DefaultFormProps<T> {
  draft: Draft<T>;
}

// What the default enrolment form asks for (spec/program-enrolment
// ui-surface S4): the form below places these, and the check after it counts
// them as asked.
const ENROLMENT_FORM_PATHS = {
  date: 'enrolmentDatetime',
  id: 'programEnrolmentId',
  notes: 'notes',
} as const;

/** The enrolment form for any ProgramEnrolment type without a plugin form. */
export const DefaultEnrolmentForm = (
  props: DefaultFormProps<ProgramEnrolment>
): JSX.Element => (
  <Stack>
    <DateInput
      draft={props.draft}
      path={ENROLMENT_FORM_PATHS.date}
      label={t('label.enrolment-datetime')}
      testId="enrolment-datetime"
    />
    <TextInput
      draft={props.draft}
      path={ENROLMENT_FORM_PATHS.id}
      label={t('label.enrolment-patient-id')}
      testId="enrolment-patient-id"
    />
    <NoteBox
      draft={props.draft}
      path={ENROLMENT_FORM_PATHS.notes}
      label={t('label.notes')}
      notes={props.draft.data.notes}
      onChange={notes => props.draft.set(ENROLMENT_FORM_PATHS.notes, notes)}
      disabled={props.draft.readOnly()}
      testId="enrolment-notes"
    />
  </Stack>
);

// What an enrolment holds without the form asking: the store it was made at.
const ENROLMENT_UNASKED_PATHS = ['storeId'];

/**
 * What the program's own form rules require that an enrolment on the default
 * form doesn't hold and can't be given there (rules § the default form): the
 * paths of the required answers outside what the form asks for and what the
 * enrolment holds without asking. Empty when the default form can stand in
 * for the program's own.
 */
export const unaskedEnrolmentAnswers = (
  registry: Pick<FormRegistryFragment, 'formSchemaId' | 'jsonSchema'>,
  data: unknown
): string[] => {
  const covered = new Set<string>([
    ...Object.values(ENROLMENT_FORM_PATHS),
    ...ENROLMENT_UNASKED_PATHS,
  ]);
  return validateDocument(
    registry.formSchemaId,
    registry.jsonSchema as JsonSchema,
    data
  )
    .filter(
      e => e.keyword === 'required' && !covered.has(e.path.split('.')[0] ?? '')
    )
    .map(e => e.path);
};

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
      draft={props.draft}
      path="notes"
      label={t('label.visit-notes')}
      notes={props.draft.data.notes}
      onChange={notes => props.draft.set('notes', notes)}
      disabled={props.draft.readOnly()}
      testId="encounter-notes"
    />
  </Stack>
);
