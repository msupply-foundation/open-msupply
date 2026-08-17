import { createEffect, createMemo, createSignal, on } from 'solid-js';
import { createStore } from 'solid-js/store';
import { hasPermission } from '../../../store/storeContext';
import { runUpdatePatient } from '../patientApi';
import { createCodeTakenCheck } from '../patientCode';
import {
  createFormValidation,
  type FormValidation,
} from '../../../ui/layout/Form/formValidation';
import {
  draftEquals,
  emptyDraft,
  isDraftValid,
  patientFieldErrors,
  seedDraft,
  toUpdateInput,
  type PatientDraft,
} from './patientEdit';
import type { PatientResult } from './patient.generated';

type PatientNode = NonNullable<PatientResult['patient']>;

export interface PatientEditorParams {
  storeId: () => string;
  /** The loaded patient to edit — undefined while unresolved. */
  node: () => PatientNode | undefined;
}

export interface PatientEditor {
  edit: PatientDraft;
  setField: <K extends keyof PatientDraft>(
    key: K,
    value: PatientDraft[K]
  ) => void;
  validation: FormValidation;
  isDirty: () => boolean;
  canMutate: () => boolean;
  saving: () => boolean;
  saveError: () => string;
  confirmSaveOpen: () => boolean;
  setConfirmSaveOpen: (open: boolean) => void;
  /** Arms validation; opens the confirm-save prompt once the draft is valid. */
  attemptSave: () => Promise<void>;
  /** Runs the write; `afterSave` fires only on success (e.g. the caller's own refetch). */
  doSave: (afterSave?: () => void) => Promise<void>;
  /** Re-seeds the draft from the current node, discarding local edits. */
  resetDraft: () => void;
}

/**
 * Shared patient-edit state (spec/patients S3 Details / S4 edit modal): the
 * local draft buffer seeded from a loaded patient, the duplicate-code check,
 * required-field validation (the armForSeed rule below), and the full-replace
 * save. Used by both the full detail page and the picker's edit modal — the
 * caller owns fetching `node` (a page's suspending first-load read, a modal's
 * interaction-triggered non-suspending one, kdd/solid-reactivity-pitfalls › no
 * remounts on interaction); this hook only reacts to it.
 */
export const createPatientEditor = (
  params: PatientEditorParams
): PatientEditor => {
  const [edit, setEdit] = createStore<PatientDraft>(emptyDraft());
  const [seededId, setSeededId] = createSignal<string>();

  // Duplicate-code check (spec/patients § generating a code), run on the save
  // attempt below, store-scoped; skipped while the code is still the one the
  // patient was loaded with, so a pre-existing collision doesn't block an
  // unrelated edit.
  const codeCheck = createCodeTakenCheck({
    storeId: params.storeId,
    code: () => edit.code,
    savedCode: () => params.node()?.code ?? '',
    patientId: () => params.node()?.id,
  });
  const validation = createFormValidation(() =>
    patientFieldErrors(edit, codeCheck.taken())
  );

  // Validation timing at a (re)seed: quiet, as a pristine form should be —
  // UNLESS the saved record itself already breaks a required rule, which a
  // patient retrieved from central does when it arrives without a code
  // (spec/patients rules › editing a patient). Then the form is armed from the
  // start.
  const armForSeed = (seed: PatientDraft) => {
    if (isDraftValid(seed)) validation.reset();
    else validation.arm();
  };

  createEffect(
    on(params.node, n => {
      if (n && n.id !== seededId()) {
        const seed = seedDraft(n);
        setEdit(seed);
        setSeededId(n.id);
        armForSeed(seed);
      }
    })
  );

  const setField = <K extends keyof PatientDraft>(
    key: K,
    value: PatientDraft[K]
  ) => setEdit(key, value);

  const canMutate = () => hasPermission('PATIENT_MUTATE');

  const isDirty = createMemo(() => {
    const n = params.node();
    if (!n || seededId() === undefined) return false;
    return !draftEquals(edit, seedDraft(n));
  });

  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');
  const [confirmSaveOpen, setConfirmSaveOpen] = createSignal(false);

  // Full-replace edit (AC-E2): toUpdateInput sends every field. On success,
  // re-seed from the refreshed record (name is recomputed server-side) by
  // clearing seededId so the seed effect re-runs once the caller's own refetch
  // lands a fresh node.
  const doSave = async (afterSave?: () => void) => {
    const n = params.node();
    if (!n || !isDraftValid(edit) || saving()) return;
    setSaving(true);
    const outcome = await runUpdatePatient(
      params.storeId(),
      toUpdateInput(n.id, edit)
    );
    setSaving(false);
    setConfirmSaveOpen(false);
    if (!outcome) return; // handled globally
    if (outcome.kind === 'error') {
      setSaveError(outcome.message);
      return;
    }
    setSaveError('');
    setSeededId(undefined);
    afterSave?.();
  };

  // Save click: arm validation first, so an invalid form reveals its errors
  // (per field + summary) instead of silently doing nothing; only a valid form
  // opens the confirmation prompt (AC-E1).
  //
  // The duplicate-code check is the one rule that needs the server, so it runs
  // here rather than in patientFieldErrors — borrowing the `saving` window so
  // the Save button shows it working and a second click can't start a second
  // check. A clash leaves the prompt closed and the error on the field.
  const attemptSave = async () => {
    validation.arm();
    if (!validation.valid() || saving()) return;
    setSaving(true);
    const taken = await codeCheck.check();
    setSaving(false);
    if (taken) return;
    setConfirmSaveOpen(true);
  };

  // Re-seed the edit buffer from the fetched patient, making the form pristine.
  const resetDraft = () => {
    const n = params.node();
    if (!n) return;
    const seed = seedDraft(n);
    setEdit(seed);
    armForSeed(seed);
  };

  return {
    edit,
    setField,
    validation,
    isDirty,
    canMutate,
    saving,
    saveError,
    confirmSaveOpen,
    setConfirmSaveOpen,
    attemptSave,
    doSave,
    resetDraft,
  };
};
