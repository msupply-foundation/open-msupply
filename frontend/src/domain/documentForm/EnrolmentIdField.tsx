/*
 * The host's enrolment ID field (spec/program-enrolment ui-surface S5, rules §
 * the enrolment ID; spec/plugins/sdk-contract.md § the enrolment form): what
 * the patient Code field is to a patient form, for a `programEnrolment.form`.
 * The program brings only its ID format (`generate`) and whether IDs may be
 * typed; the host owns the rest, so every program generates, regenerates and
 * checks for duplicates the same way. From the form library's chunk; plugins
 * reach it through the SDK's lazy wrapper.
 */
import { createSignal, onCleanup, onMount, untrack, type JSX } from 'solid-js';
import { t } from '../../intl';
import { FormRow } from '../../ui/layout/Form/FormRow';
import { TextField } from '../../ui/elements/inputs/TextField';
import { Button } from '../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { createDebounced } from '../../ui/utils/createDebounced';
import { currentStoreId } from '../../store/storeContext';
import type { ProgramEnrolment } from '../../plugin-sdk/documents';
import type { FormRecordView } from '../../plugin-sdk/types';
import type { Draft } from './draft';
import { drawFreeEnrolmentId, isEnrolmentIdFree } from './enrolmentId';
import styles from './EnrolmentIdField.module.css';

export interface EnrolmentIdFieldProps<
  T extends ProgramEnrolment = ProgramEnrolment,
> {
  draft: Draft<T>;
  /**
   * The form's own record view: whether the enrolment is new, and which
   * enrolment it is, so its own saved ID is never its duplicate.
   */
  record: FormRecordView;
  /**
   * The program's ID format: one candidate ID, its number drawn with
   * `allocateProgramNumber`. Undefined when none could be drawn (the failure
   * is already reported).
   */
  generate: () => Promise<string | undefined>;
  /** Whether users may type their own ID; read-only otherwise. */
  allowTyping?: boolean;
  /** The field's label; "Enrolment patient ID" when absent. */
  label?: string;
  /** Disables the field whatever the draft's read-only state. */
  disabled?: boolean;
  /** The input's test id (`enrolment-id`); Generate's adds `-generate`. */
  testId?: string;
}

// How long typing must pause before a typed ID is checked.
const CHECK_DELAY_MS = 500;

export const EnrolmentIdField = <T extends ProgramEnrolment>(
  props: EnrolmentIdFieldProps<T>
): JSX.Element => {
  // Every program's enrolment type extends the base one, which has the path.
  const d = () => props.draft as unknown as Draft<ProgramEnrolment>;
  const held = () => d().get('programEnrolmentId') ?? '';
  const disabled = () => props.disabled === true || d().readOnly();
  const testId = () => props.testId ?? 'enrolment-id';
  // `record` updates in place, its name arriving with the first save, so
  // whether this open is a new enrolment is read once.
  const openedNew = untrack(() => props.record.documentName === undefined);

  const [generating, setGenerating] = createSignal(false);
  const [confirming, setConfirming] = createSignal(false);
  const label = () => props.label ?? t('label.enrolment-patient-id');

  // The enrolment takes the ID without surrounding spaces (rules § typing an
  // ID, and duplicates), while the box keeps exactly what is being typed, so
  // a space typed between two parts survives the keystroke. The typed text
  // shows only while it still stands for the ID the enrolment holds: any
  // change underneath (a generated ID, a discard) shows instead.
  const [typed, setTyped] = createSignal<string>();
  const text = () => {
    const value = typed();
    return value !== undefined && value.trim() === held() ? value : held();
  };

  // What is typed goes into the enrolment at once, so what is saved is what
  // the box shows. A typed ID another enrolment holds fails the field, which
  // blocks the save until the ID is changed (rules § typing an ID, and
  // duplicates); the save waits for a check still running on what was typed.
  let release: (() => void) | undefined;
  const holdSave = () => {
    if (!release) d().wait(new Promise<void>(r => (release = r)));
  };
  const releaseSave = () => {
    release?.();
    release = undefined;
  };
  onCleanup(releaseSave);

  // Each keystroke and each generation outdates any check still running, so
  // a late answer never speaks for an ID no longer in the box.
  let checkRun = 0;

  const checkTyped = async (typed: string) => {
    const run = ++checkRun;
    const free = await isEnrolmentIdFree(
      currentStoreId() ?? '',
      typed,
      props.record.documentName
    );
    if (run !== checkRun) return;
    d().setError(
      'programEnrolmentId',
      free === false ? t('error.duplicated-id', { id: typed }) : undefined,
      label()
    );
    releaseSave();
  };
  const check = createDebounced(
    (typed: string) => void checkTyped(typed),
    CHECK_DELAY_MS
  );

  // `fill` on open, so a generated ID is not an edit (rules § leaving with
  // unsaved changes); `set` when the user asks for one.
  const generate = async (write: 'fill' | 'set') => {
    if (generating()) return;
    setGenerating(true);
    const storeId = currentStoreId() ?? '';
    const ownName = props.record.documentName;
    const id = await drawFreeEnrolmentId(props.generate, candidate =>
      isEnrolmentIdFree(storeId, candidate, ownName)
    );
    setGenerating(false);
    if (id === undefined) return;
    check.cancel();
    checkRun++;
    d()[write]('programEnrolmentId', id);
    d().setError('programEnrolmentId', undefined);
    releaseSave();
  };

  // A new enrolment opens with its ID already generated (rules § generating).
  onMount(() => {
    if (openedNew && held() === '' && !disabled()) void generate('fill');
  });

  // Replacing an ID the user can see discards it and spends a number that is
  // never given back, so it asks first; an empty field generates at once.
  const onGenerate = () => {
    if (held() !== '') setConfirming(true);
    else void generate('set');
  };

  const onInput = (value: string) => {
    checkRun++;
    setTyped(value);
    const id = value.trim();
    d().set('programEnrolmentId', id || undefined);
    d().setError('programEnrolmentId', undefined);
    if (id === '') {
      check.cancel();
      releaseSave();
      return;
    }
    holdSave();
    check(id);
  };

  return (
    <>
      <FormRow>
        <TextField
          label={label()}
          value={text()}
          readOnly={props.allowTyping !== true}
          required={d().schemaFor('programEnrolmentId')?.required ?? false}
          error={d().errorFor('programEnrolmentId')}
          disabled={disabled()}
          onInput={e => onInput(e.currentTarget.value)}
          data-testid={testId()}
        />
        <Button
          class={styles.generate}
          variant="secondary"
          disabled={disabled()}
          loading={generating()}
          onClick={onGenerate}
          data-testid={`${testId()}-generate`}
        >
          {t('label.generate')}
        </Button>
      </FormRow>
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.regenerate-id-confirm')}
        onConfirm={() => void generate('set')}
      />
    </>
  );
};
