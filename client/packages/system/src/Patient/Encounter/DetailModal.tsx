import React, { FC } from 'react';
import {
  DetailViewSkeleton,
  DialogButton,
  SaveDocumentMutation,
  useDialog,
  useJsonForms,
} from '@openmsupply-client/common';
import { useEncounter } from './api/hooks';
import { usePatientModalStore } from '../hooks';
import { PatientModal } from '../DetailView';
import { usePatient } from '../api';

const useUpsertEncounter = (
  patientId: string,
  programType: string,
  type: string
): SaveDocumentMutation => {
  const { mutateAsync: insertEncounter } = useEncounter.document.insert();
  const { mutateAsync: updateEncounter } = useEncounter.document.update();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertEncounter({
        data: jsonData,
        schemaId: formSchemaId,
        patientId,
        type,
        programType,
      });
      return result;
    } else {
      const result = await updateEncounter({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
      });
      return result;
    }
  };
};

export const EncounterDetailModal: FC = () => {
  const patientId = usePatient.utils.id();

  const { current, documentName, programType, documentType, reset } =
    usePatientModalStore();
  const handleSave = useUpsertEncounter(
    patientId,
    programType ?? '',
    documentType ?? ''
  );
  const { JsonForm, isLoading } = useJsonForms(documentName, {
    handleSave,
    showButtonPanel: false,
  });

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Encounter,
    onClose: reset,
  });

  if (isLoading) return <DetailViewSkeleton />;

  return (
    <Modal
      title=""
      cancelButton={<DialogButton variant="cancel" onClick={reset} />}
      okButton={<DialogButton variant="ok" onClick={reset} />}
      width={1024}
    >
      <React.Suspense fallback={<DetailViewSkeleton />}>
        {documentName ? (
          isLoading ? (
            <DetailViewSkeleton />
          ) : (
            JsonForm
          )
        ) : (
          'Encounter form'
        )}
      </React.Suspense>
    </Modal>
  );
};
