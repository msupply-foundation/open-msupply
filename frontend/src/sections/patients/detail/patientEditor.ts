import { createEffect, createMemo, createSignal, on } from 'solid-js';
import { createStore } from 'solid-js/store';
import { hasPermission } from '../../../store/storeContext';
import { runUpdatePatient } from '../patientApi';
import { createCodeTakenCheck } from '../../../domain/patient/patientCode';
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
  /**
   * Runs the write; `afterSave` fires only on success. Its result — the
   * caller's re-read of the patient — is awaited, then the draft re-seeds from
   * the stored record and the after-save state ends.
   */
  doSave: (afterSave?: () => void | Promise<unknown>) => Promise<void>;
  /**
   * Re-seeds the draft from the current node, or from what was saved while its
   * re-read is still out, discarding local edits.
   */
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
  // The draft as saved, held from a successful save until the caller's re-read
  // of the patient lands. The form shows it and the dirty/discard checks
  // compare against it meanwhile, so the draft does not revert to the pre-save
  // record the re-read still returns until it resolves (the state gate re-runs
  // `node` as the read starts). doSave clears this and re-seeds from the
  // re-read once it lands.
  const [saved, setSaved] = createSignal<PatientDraft>();

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

  // Seed, and re-seed, from a patient of a different id than the one already
  // seeded — never from a fresh read of the same patient, which would wipe an
  // unsaved edit. The after-save re-seed (from the save's own re-read) is
  // doSave's, so the draft keeps showing what was saved until that read lands.
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
    return !draftEquals(edit, saved() ?? seedDraft(n));
  });

  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal('');
  const [confirmSaveOpen, setConfirmSaveOpen] = createSignal(false);

  // Full-replace edit (OMS-REG-DIS-02.41): toUpdateInput sends every field. On
  // success the form holds the saved draft until the caller's re-read lands;
  // awaiting `afterSave` (that re-read) then re-seeds from the record as stored
  // — the name recomputed server-side, Code 2 of spaces stored as none — and
  // ends the after-save state. A re-read that does not land (none requested, or
  // it failed) keeps the saved draft as the baseline.
  const doSave = async (afterSave?: () => void | Promise<unknown>) => {
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
    const draft = { ...edit };
    setSaved(draft);
    armForSeed(draft);
    let reread: unknown;
    try {
      reread = await afterSave?.();
    } catch {
      return; // the re-read failed: keep the saved draft as the baseline
    }
    // `afterSave` returns the re-read patient; a result means it landed (even
    // when structural sharing hands back the same object). Re-seed from the
    // node as it now reads, so the form shows what was stored.
    if (reread === undefined) return;
    const fresh = params.node();
    if (!fresh) return;
    const seed = seedDraft(fresh);
    setEdit(seed);
    setSeededId(fresh.id);
    setSaved(undefined);
    armForSeed(seed);
  };

  // Save click: arm validation first, so an invalid form reveals its errors
  // (per field + summary) instead of silently doing nothing; only a valid form
  // opens the confirmation prompt (OMS-REG-DIS-02.40).
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

  // Re-seed the edit buffer from the fetched patient, or the saved draft while
  // its re-read is still out, making the form pristine.
  const resetDraft = () => {
    const n = params.node();
    if (!n) return;
    const seed = { ...(saved() ?? seedDraft(n)) };
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
