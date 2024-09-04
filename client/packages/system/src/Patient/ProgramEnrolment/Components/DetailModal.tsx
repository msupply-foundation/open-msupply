import React, { FC } from 'react';
import {
  BasicSpinner,
  Box,
  CheckIcon,
  DialogButton,
  LoadingButton,
  ModalTabs,
  SaveIcon,
  Typography,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import { usePatient } from '../../api';
import {
  DocumentHistory,
  PatientModal,
  SaveDocumentMutation,
  useDocumentDataAccessor,
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
  const t = useTranslation('programs');
  const patientId = usePatient.utils.id();

  const { current, document, reset } = usePatientModalStore();
  const handleSave = useUpsertProgramEnrolment(patientId, document?.type || '');

  const dataAccessor = useDocumentDataAccessor(
    document?.name,
    document?.createDocument,
    handleSave
  );
  const { JsonForm, isLoading, isSaving, saveData, isDirty, validationError } =
    useJsonForms(
      {
        documentName: document?.name,
        patientId,
      },
      dataAccessor
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
        {t('label.document-edit-history')}
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
        <LoadingButton
          color="secondary"
          loadingStyle={{ iconColor: 'secondary.main' }}
          disabled={!isDirty || !!validationError}
          isLoading={isSaving}
          onClick={async () => {
            await saveData();
            reset();
          }}
          startIcon={isCreating ? <SaveIcon /> : <CheckIcon />}
          sx={{ marginLeft: 2 }}
        >
          {isCreating ? t('button.save') : t('button.ok')}
        </LoadingButton>
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
