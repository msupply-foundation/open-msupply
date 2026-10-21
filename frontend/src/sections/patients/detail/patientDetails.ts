import {
  createEffect,
  createResource,
  type Accessor,
  type Resource,
} from 'solid-js';
import { gated } from '../../../api/gated';
import { graphqlFetch } from '../../../api/graphql';
import type { FormRegistryFragment } from '../../../domain/documentForm/documentForm.generated';
import { createPatientEditor, type PatientEditor } from './patientEditor';
import {
  createPatientDocumentEditor,
  type PatientDocumentEditor,
} from './patientDocumentEditor';
import { loadFormLibrary } from '../../../domain/documentForm/createDocumentForm';
import {
  fetchPatientRegistry,
  rememberedPatientRegistry,
} from './programs/programsApi';
import {
  Patient,
  PatientWithDocument,
  type PatientResult,
  type PatientWithDocumentResult,
} from './patient.generated';

/** The patient as read on either path; the document path's read says more. */
export type PatientNode =
  | NonNullable<PatientResult['patient']>
  | NonNullable<PatientWithDocumentResult['patient']>;

export interface PatientDetailsParams {
  storeId: Accessor<string>;
  patientId: Accessor<string>;
}

export interface PatientDetails {
  /**
   * The patient read, for the screen's own read of it: suspending for a
   * first load, gated under an open surface.
   */
  patient: Resource<PatientNode | undefined>;
  /** The patient as last read, undefined while unresolved. */
  node: Accessor<PatientNode | undefined>;
  /** Re-reads the patient (after a save, which makes a new version). */
  refetch: () => void;
  /** The plain path's editor: the patient record's own fields. */
  editor: PatientEditor;
  /** The document path's editor: the patient document, on the store's form. */
  documentEditor: PatientDocumentEditor;
  /**
   * The store's Patient registry read: undefined while unanswered, then
   * `entry` undefined when none is installed.
   */
  registry: Accessor<{ entry: FormRegistryFragment | undefined } | undefined>;
  onDocumentPath: Accessor<boolean>;
  /** The editor the patient's details save through, whichever path. */
  active: Accessor<PatientEditor | PatientDocumentEditor>;
  canSave: Accessor<boolean>;
}

/*
 * A patient's details, on whichever persistence path the store is on
 * (spec/patients rules › two persistence paths): the store's Patient registry
 * entry decides. Shared by the patient screen's Details tab and the picker's
 * edit-patient modal, so a store with a patient document type writes it from
 * both, and neither saves the record underneath a document that would then
 * overwrite it.
 *
 * The patient read is this module's too, as the path decides its shape: on
 * the document path the one read carries the document's draft and its latest
 * version as the form opens it, so the Details tab shows the form after one
 * round trip rather than three (#1562). The path is known from the registry
 * read, or from the store's answer earlier this session; the first patient
 * opened in a store waits for the registry, the rest do not.
 */
export const createPatientDetails = (
  params: PatientDetailsParams
): PatientDetails => {
  const [registryData] = createResource(
    () => params.storeId(),
    fetchPatientRegistry
  );
  const registry = () => gated(registryData);
  const onDocumentPath = () => registry()?.entry !== undefined;

  // Whether to read the patient with its document: the registry's answer once
  // it has one (a failed read answers "no entry", as it does for the path),
  // the store's remembered answer before that, nothing until either.
  const withDocument = (): boolean | undefined => {
    const answered =
      registryData.state === 'ready' || registryData.state === 'errored';
    if (answered) return onDocumentPath();
    const remembered = rememberedPatientRegistry(params.storeId());
    return remembered ? remembered.entry !== undefined : undefined;
  };

  const [patient, { refetch }] = createResource(
    () => {
      const shape = withDocument();
      return shape === undefined
        ? undefined
        : JSON.stringify({
            storeId: params.storeId(),
            patientId: params.patientId(),
            withDocument: shape,
          });
    },
    async (serialised): Promise<PatientNode | undefined> => {
      const { withDocument, ...variables } = JSON.parse(serialised) as {
        storeId: string;
        patientId: string;
        withDocument: boolean;
      };
      const result = await graphqlFetch(
        withDocument ? PatientWithDocument : Patient,
        variables
      );
      if (result.kind === 'success') return result.data.patient ?? undefined;
      if (!withDocument) return undefined;
      // The read with the document failed (a stored document the server
      // could not read, reported above): the patient still opens on its
      // record, with no form, as it did when the draft was read on its own.
      const record = await graphqlFetch(Patient, variables);
      return record.kind === 'success'
        ? (record.data.patient ?? undefined)
        : undefined;
    }
  );
  const node = () => patient.latest ?? undefined;

  const editor = createPatientEditor({ storeId: params.storeId, node });

  // The form library chunk (validator, fields, default forms) is otherwise
  // requested only once the patient has been read. Start it as soon as the
  // registry says the document path is in use; the import is shared with the
  // form host's own call.
  createEffect(() => {
    if (onDocumentPath()) void loadFormLibrary();
  });

  const documentEditor = createPatientDocumentEditor({
    storeId: params.storeId,
    node,
    registry: () => registry()?.entry,
  });

  return {
    patient,
    node,
    refetch: () => void refetch(),
    editor,
    documentEditor,
    registry,
    onDocumentPath,
    active: () => (onDocumentPath() ? documentEditor : editor),
    canSave: () =>
      onDocumentPath()
        ? documentEditor.canSave() && !documentEditor.saving()
        : editor.isDirty() && !editor.saving(),
  };
};
