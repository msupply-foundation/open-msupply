import {
  createMemo,
  createResource,
  createSignal,
  type Accessor,
} from 'solid-js';
import { gated } from '../../../api/gated';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { hasPermission } from '../../../store/storeContext';
import { createCodeTakenCheck } from '../../../domain/patient/patientCode';
import {
  createDocumentForm,
  type DocumentForm,
  type DocumentFormSource,
} from '../../../domain/documentForm/createDocumentForm';
import type { FormRegistryFragment } from '../../../domain/documentForm/documentForm.generated';
import { documentFormVersioning } from '../../../plugins/documentFormSlot';
import type { Patient } from '../../../plugin-sdk/documents';
import { seedPatientDocument } from './patientDocumentSeed';
import type { PatientResult } from './patient.generated';
import { PatientDocumentDraft } from './patientDocumentDraft.generated';

type PatientNode = NonNullable<PatientResult['patient']>;

/*
 * The Details tab's editor on the document path (kdd/custom-forms/specs.md §
 * Host-owned surfaces, Patient): the patient document in the document form
 * host, with the save surface the plain-path editor gives the screen
 * (patientEditor.ts), so the screen's footer, confirm prompt and leave guard
 * work the same on both paths.
 *
 * A patient with a document is edited from the server's `documentDraft` (the
 * latest version with later changes to the name row merged in), read here
 * and only here, and saved as the next version. A patient with none, a name
 * row made by the plain path or a sync, is seeded from that row and gets its
 * first document on its first Save; opening it writes nothing.
 */

/**
 * A patient document's draft: `draft` undefined where the server has none;
 * undefined itself where the read failed, which the app reports.
 */
export const fetchPatientDocumentDraft = async (key: {
  storeId: string;
  patientId: string;
}): Promise<{ draft: object | undefined } | undefined> => {
  const result = await graphqlFetch(PatientDocumentDraft, key);
  if (result.kind !== 'success') return undefined;
  return {
    draft: (result.data.patient?.documentDraft as object | null) ?? undefined,
  };
};

/** The error summary's names for the host's patient fields, by path. */
const patientFieldLabels = (): Record<string, string> => ({
  code: t('label.code'),
  code2: t('label.code2'),
  firstName: t('label.first-name'),
  lastName: t('label.last-name'),
  dateOfBirth: t('label.date-of-birth'),
  gender: t('label.gender'),
  contactDetails: t('label.contact'),
  nextOfKin: t('label.next-of-kin'),
  dateOfDeath: t('label.date-of-death'),
});

export interface PatientDocumentEditorParams {
  storeId: Accessor<string>;
  /** The loaded patient — undefined while unresolved. */
  node: Accessor<PatientNode | undefined>;
  /** The store's Patient registry entry; undefined off the document path. */
  registry: Accessor<FormRegistryFragment | undefined>;
}

export interface PatientDocumentEditor {
  form: DocumentForm<Patient>;
  isDirty: () => boolean;
  canMutate: () => boolean;
  canSave: () => boolean;
  saving: () => boolean;
  saveError: () => string;
  confirmSaveOpen: () => boolean;
  setConfirmSaveOpen: (open: boolean) => void;
  /** Arms validation and checks the code; opens the confirm once valid. */
  attemptSave: () => Promise<void>;
  /** Runs the write; `afterSave` fires only on success. */
  doSave: (afterSave?: () => void) => Promise<void>;
  resetDraft: () => void;
}

/** What the two editors below share: the document form and its code check. */
interface PatientDocumentFormCore {
  form: DocumentForm<Patient>;
  codeCheck: ReturnType<typeof createCodeTakenCheck>;
  canMutate: () => boolean;
}

const createPatientDocumentFormCore = (params: {
  storeId: Accessor<string>;
  patientId: Accessor<string>;
  source: Accessor<DocumentFormSource | undefined>;
  /** The code as last saved, which the duplicate-code check leaves alone. */
  savedCode: Accessor<string>;
  /** The patient whose own code the check ignores; none while creating. */
  existingPatientId: Accessor<string | undefined>;
}): PatientDocumentFormCore => {
  const canMutate = () => hasPermission('PATIENT_MUTATE');

  // The duplicate-code check (spec/patients § generating a code): whoever
  // renders the code, the host's field or a plugin's, the save attempt checks
  // it. Declared before the form, which shows its answer as an error; its
  // code accessor reads the form's draft once both exist.
  let form: DocumentForm<Patient> | undefined;
  const codeCheck = createCodeTakenCheck({
    storeId: params.storeId,
    code: () => form?.draft.data.code ?? '',
    savedCode: params.savedCode,
    patientId: params.existingPatientId,
  });

  form = createDocumentForm<Patient>({
    storeId: params.storeId,
    patientId: params.patientId,
    source: params.source,
    labels: patientFieldLabels,
    extraErrors: () => [
      {
        id: 'code',
        label: t('label.code'),
        failed: codeCheck.taken(),
        message: t('error.duplicated-code', {
          code: (form?.draft.data.code ?? '').trim(),
        }),
      },
    ],
    readOnly: () => !canMutate(),
    versioning: type => documentFormVersioning('patient.form', type),
  });

  return { form, codeCheck, canMutate };
};

export const createPatientDocumentEditor = (
  params: PatientDocumentEditorParams
): PatientDocumentEditor => {
  // Read on the document path for a patient with a document, and again
  // whenever the patient is re-read (after a save), as the draft goes with it.
  const [draftData] = createResource(() => {
    const node = params.node();
    return params.registry() && node?.document
      ? { storeId: params.storeId(), patientId: node.id }
      : undefined;
  }, fetchPatientDocumentDraft);

  // The source, with the patient it was made for. While the draft is still
  // being read, the source already shown for this patient stays in place. A
  // first save re-reads the patient, which now has a document; dropping the
  // source there would take the form down and mount a new one
  // (sdk-contract § Props update in place, OMS-REG-PLG-05.10). The form's
  // saved version stands for the record until the draft arrives.
  type PatientSource = { patientId: string; source: DocumentFormSource };
  const sourceFor = createMemo(
    (prev: PatientSource | undefined): PatientSource | undefined => {
      const registry = params.registry();
      const node = params.node();
      if (!registry || !node) return undefined;
      if (node.document) {
        const read = gated(draftData);
        if (read) {
          return {
            patientId: node.id,
            source: {
              kind: 'existing',
              name: node.document.name,
              seed: read.draft,
            },
          };
        }
        // A failed read has answered too: it shows no form, as before.
        const answered =
          draftData.state === 'ready' || draftData.state === 'errored';
        return !answered && prev?.patientId === node.id ? prev : undefined;
      }
      return {
        patientId: node.id,
        source: { kind: 'new', registry, data: seedPatientDocument(node) },
      };
    },
    undefined
  );
  const source = () => sourceFor()?.source;

  const {
    form: documentForm,
    codeCheck,
    canMutate,
  } = createPatientDocumentFormCore({
    storeId: params.storeId,
    patientId: () => params.node()?.id ?? '',
    source,
    savedCode: () => params.node()?.code ?? '',
    existingPatientId: () => params.node()?.id,
  });

  const [checking, setChecking] = createSignal(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = createSignal(false);

  // A patient without a document opens pristine and saves only once edited,
  // as the plain path does; so does a document migrated from an earlier
  // version, unless the migration changed it (#1501).
  const canSave = () =>
    documentForm.status() === 'ready' &&
    canMutate() &&
    documentForm.canSave() &&
    documentForm.isDirty();

  const attemptSave = async () => {
    documentForm.validation.arm();
    if (!documentForm.validation.valid() || checking()) return;
    setChecking(true);
    const taken = await codeCheck.check();
    setChecking(false);
    if (taken) return;
    setConfirmSaveOpen(true);
  };

  const doSave = async (afterSave?: () => void) => {
    const saved = await documentForm.save();
    setConfirmSaveOpen(false);
    if (saved) afterSave?.();
  };

  return {
    form: documentForm,
    isDirty: documentForm.isDirty,
    canMutate,
    canSave,
    saving: () => checking() || documentForm.saving(),
    saveError: () => documentForm.saveError() ?? '',
    confirmSaveOpen,
    setConfirmSaveOpen,
    attemptSave,
    doSave,
    resetDraft: documentForm.discard,
  };
};

export interface NewPatientDocumentParams {
  storeId: Accessor<string>;
  /** The identifier minted for the patient being created. */
  patientId: Accessor<string>;
  /** The store's Patient registry entry; undefined off the document path. */
  registry: Accessor<FormRegistryFragment | undefined>;
  /** The new patient's first data; undefined until the wizard reaches it. */
  seed: Accessor<Patient | undefined>;
}

export interface NewPatientDocumentEditor {
  form: DocumentForm<Patient>;
  saving: () => boolean;
  saveError: () => string;
  /**
   * Arms validation, checks the code and, when both pass, writes the new
   * patient with its first document. Resolves true once written.
   */
  create: () => Promise<boolean>;
}

/*
 * The create wizard's last step on the document path (spec/patients › effects
 * of creation): a new patient's first document, in the same document form host
 * and with the same code check as the Details tab, seeded from the wizard's
 * first step. It saves without the Details tab's confirm, as the plain path's
 * wizard does.
 */
export const createNewPatientDocumentEditor = (
  params: NewPatientDocumentParams
): NewPatientDocumentEditor => {
  const source = createMemo((): DocumentFormSource | undefined => {
    const registry = params.registry();
    const seed = params.seed();
    return registry && seed ? { kind: 'new', registry, data: seed } : undefined;
  });

  const { form, codeCheck } = createPatientDocumentFormCore({
    storeId: params.storeId,
    patientId: params.patientId,
    source,
    savedCode: () => '',
    existingPatientId: () => undefined,
  });

  const [checking, setChecking] = createSignal(false);

  const create = async () => {
    form.validation.arm();
    if (!form.validation.valid() || checking() || form.saving()) return false;
    setChecking(true);
    const taken = await codeCheck.check();
    setChecking(false);
    if (taken) return false;
    return (await form.save()) !== undefined;
  };

  return {
    form,
    saving: () => checking() || form.saving(),
    saveError: () => form.saveError() ?? '',
    create,
  };
};
