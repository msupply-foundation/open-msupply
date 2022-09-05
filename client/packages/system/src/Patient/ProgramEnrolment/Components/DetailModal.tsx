import React, { FC } from 'react';
import {
  BasicSpinner,
  Box,
  DialogButton,
  useDialog,
} from '@openmsupply-client/common';
import { useProgramEnrolment } from '../api/hooks';
import { usePatientModalStore } from '../../hooks';
import { PatientModal } from '../../PatientView';
import { usePatient } from '../../api';
import { SaveDocumentMutation, useJsonForms } from '../../JsonForms';

const useUpsertProgramEnrolment = (
  patientId: string,
  type: string
): SaveDocumentMutation => {
  const { mutateAsync: insertProgramEnrolment } =
    useProgramEnrolment.document.insert();
  const { mutateAsync: updateProgramEnrolment } =
    useProgramEnrolment.document.update();

  return async (jsonData: unknown, formSchemaId: string, parent?: string) =>
    parent === undefined
      ? await insertProgramEnrolment({
          data: jsonData,
          schemaId: formSchemaId,
          patientId,
          type,
        })
      : updateProgramEnrolment({
          data: jsonData,
          parent,
          schemaId: formSchemaId,
          patientId,
          type,
        });
};

export const ProgramDetailModal: FC = () => {
  const patientId = usePatient.utils.id();

  const { current, document, reset } = usePatientModalStore();
  const handleSave = useUpsertProgramEnrolment(patientId, document?.type || '');
  const { JsonForm, isLoading, saveData, isDirty, validationError } =
    useJsonForms(
      document?.name,
      {
        handleSave,
      },
      document?.createDocument
    );

  const isOpen = current === PatientModal.Program;
  const { Modal } = useDialog({
    isOpen,
    onClose: reset,
  });

  const isCreating = document?.name === undefined;

  // Make sure we unmount if are not open to get into a clean state when remounting:
  if (!isOpen) return null;
  return (
    <Modal
      title=""
      cancelButton={<DialogButton variant="cancel" onClick={reset} />}
      okButton={
        <DialogButton
          variant={isCreating ? 'create' : 'ok'}
          disabled={!isDirty || !!validationError}
          onClick={async () => {
            await saveData();
            reset();
          }}
        />
      }
      width={1024}
    >
      <React.Suspense fallback={<div />}>
        {isLoading ? (
          <Box display="flex">
            <BasicSpinner />
          </Box>
        ) : (
          JsonForm
        )}
      </React.Suspense>
    </Modal>
  );
};
