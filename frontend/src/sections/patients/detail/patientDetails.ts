import { createResource, type Accessor } from 'solid-js';
import { gated } from '../../../api/gated';
import type { FormRegistryFragment } from '../../../domain/documentForm/documentForm.generated';
import {
  createPatientEditor,
  type PatientEditor,
  type PatientEditorParams,
} from './patientEditor';
import {
  createPatientDocumentEditor,
  type PatientDocumentEditor,
} from './patientDocumentEditor';
import { fetchPatientRegistry } from './programs/programsApi';

export interface PatientDetails {
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
 */
export const createPatientDetails = (
  params: PatientEditorParams
): PatientDetails => {
  const editor = createPatientEditor(params);

  const [registryData] = createResource(
    () => params.storeId(),
    fetchPatientRegistry
  );
  const registry = () => gated(registryData);
  const onDocumentPath = () => registry()?.entry !== undefined;

  const documentEditor = createPatientDocumentEditor({
    ...params,
    registry: () => registry()?.entry,
  });

  return {
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
