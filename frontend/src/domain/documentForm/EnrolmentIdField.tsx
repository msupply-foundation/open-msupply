/*
 * The host's enrolment ID field (spec/program-enrolment ui-surface S5, rules §
 * the enrolment ID; spec/plugins/sdk-contract.md § the enrolment form): what
 * the patient Code field is to a patient form, for a `programEnrolment.form`.
 * The program brings only its ID format (`generate`) and whether IDs may be
 * typed; the host owns the rest, so every program generates, regenerates and
 * checks for duplicates the same way. From the form library's chunk; plugins
 * reach it through the SDK's lazy wrapper.
 */
import {
  createEffect,
  createSignal,
  on,
  onMount,
  untrack,
  type JSX,
} from 'solid-js';
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

  // The box shows the ID the enrolment holds, read live, or what was typed
  // while the enrolment has not taken it: still being checked, or a flagged
  // duplicate, which stays on screen while the enrolment keeps the last ID
  // the field accepted (rules § typing an ID, and duplicates). Read live, not
  // captured: the field can mount before the form seeds the draft.
  const [typed, setTyped] = createSignal<string>();
  const text = () => typed() ?? held();
  const [duplicate, setDuplicate] = createSignal<string>();
  const [generating, setGenerating] = createSignal(false);
  const [confirming, setConfirming] = createSignal(false);

  // A change underneath (a generated ID, a check's write, a discard) replaces
  // whatever was typed.
  createEffect(
    on(
      held,
      () => {
        setTyped(undefined);
        setDuplicate(undefined);
      },
      { defer: true }
    )
  );

  // Each keystroke, each typed check and each generation outdates any check
  // still running, so a late answer never writes over newer typing.
  let checkRun = 0;

  const checkTyped = async (typed: string) => {
    const run = ++checkRun;
    if (typed === '') {
      d().set('programEnrolmentId', undefined);
      return;
    }
    const free = await isEnrolmentIdFree(
      currentStoreId() ?? '',
      typed,
      props.record.documentName
    );
    if (run !== checkRun) return;
    if (free === false) {
      setDuplicate(typed);
      return;
    }
    d().set('programEnrolmentId', typed);
    setTyped(undefined);
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
    setTyped(undefined);
    setDuplicate(undefined);
  };

  // A new enrolment opens with its ID already generated (rules § generating).
  onMount(() => {
    if (openedNew && held() === '' && !disabled()) void generate('fill');
  });

  // Replacing an ID the user can see discards it and spends a number that is
  // never given back, so it asks first; an empty field generates at once.
  const onGenerate = () => {
    if (text().trim() !== '') setConfirming(true);
    else void generate('set');
  };

  const error = () => {
    const id = duplicate();
    return id === undefined
      ? d().errorFor('programEnrolmentId')
      : t('error.duplicated-id', { id });
  };

  return (
    <>
      <FormRow>
        <TextField
          label={props.label ?? t('label.enrolment-patient-id')}
          value={text()}
          readOnly={props.allowTyping !== true}
          required={d().schemaFor('programEnrolmentId')?.required ?? false}
          error={error()}
          disabled={disabled()}
          onInput={e => {
            const value = e.currentTarget.value;
            checkRun++;
            setTyped(value);
            setDuplicate(undefined);
            check(value);
          }}
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
