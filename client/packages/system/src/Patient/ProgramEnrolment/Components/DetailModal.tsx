import React, { FC } from 'react';
import {
  BasicSpinner,
  Box,
  DialogButton,
  ModalTabs,
  Typography,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import { usePatient } from '../../api';
import {
  DocumentHistory,
  PatientModal,
  SaveDocumentMutation,
  useJsonForms,
  usePatientModalStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';

const useUpsertProgramEnrolment = (
  patientId: string,
  type: string
): SaveDocumentMutation => {
  const { mutateAsync: insertProgramEnrolment } =
    useProgramEnrolments.document.insert();
  const { mutateAsync: updateProgramEnrolment } =
    useProgramEnrolments.document.update();

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
  const t = useTranslation('common');
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

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Program,
    onClose: reset,
  });

  const isCreating = document?.name === undefined;

  const history = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={2}
      height={750}
    >
      <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
        Document Edit History
      </Typography>
      {document?.name ? (
        <DocumentHistory documentName={document?.name} />
      ) : null}
    </Box>
  );

  const tabs = [
    {
      Component: JsonForm,
      value: t('heading.details'),
    },
    {
      Component: history,
      value: t('heading.history'),
    },
  ];

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
      width={700}
    >
      <React.Suspense fallback={<div />}>
        {isLoading ? (
          <Box display="flex">
            <BasicSpinner />
          </Box>
        ) : (
          <ModalTabs tabs={tabs} />
        )}
      </React.Suspense>
    </Modal>
  );
};
