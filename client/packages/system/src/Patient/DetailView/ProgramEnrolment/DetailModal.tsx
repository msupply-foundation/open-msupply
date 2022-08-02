import React, { FC } from 'react';
import {
  DetailViewSkeleton,
  DialogButton,
  SaveDocumentMutation,
  useDialog,
  useJsonForms,
} from '@openmsupply-client/common';
import { useProgramEnrolment } from './api/hooks';
import { usePatientModalStore } from '../../hooks';
import { PatientModal } from '..';
import { usePatient } from '../../api';

const useUpsertProgramEnrolment = (
  patientId: string,
  type: string
): SaveDocumentMutation => {
  const { mutateAsync: insertProgram } = useProgramEnrolment.document.insert();
  const { mutateAsync: updateProgramEnrolment } =
    useProgramEnrolment.document.update();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertProgram({
        data: jsonData,
        schemaId: formSchemaId,
        patientId,
        type,
      });
      return result;
    } else {
      const result = await updateProgramEnrolment({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
        patientId,
        type,
      });
      return result;
    }
  };
};

export const ProgramDetailModal: FC = () => {
  const patientId = usePatient.utils.id();

  const { current, documentName, documentType, reset } = usePatientModalStore();
  const handleSave = useUpsertProgramEnrolment(patientId, documentType || '');
  const { JsonForm, isLoading } = useJsonForms(documentName, {
    handleSave,
    showButtonPanel: false,
  });

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Program,
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
          'Program enrolment form'
        )}
      </React.Suspense>
    </Modal>
  );
};
