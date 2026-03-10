import React, { useCallback, useEffect } from 'react';
import {
  useConfirmationModal,
  useNotification,
  Box,
  useTranslation,
  BasicSpinner,
} from '@openmsupply-client/common';
import { usePatientStore } from '@openmsupply-client/programs';
import { Footer } from './Footer';
import { useUpsertPatient } from '../EditPatientModal/useUpsertPatient';

export const PatientDetailView = ({
  patientId,
  onEdit,
}: {
  patientId: string;
  onEdit: (isDirty: boolean) => void;
}) => {
  const t = useTranslation();
  const { error } = useNotification();
  const { documentName } = usePatientStore();

  const {
    JsonForm,
    save,
    isLoading,
    isSaving,
    isDirty,
    validationError,
    inputData,
  } = useUpsertPatient(patientId);

  useEffect(() => {
    onEdit(isDirty);
  }, [isDirty, onEdit]);

  const handleSave = useCallback(async () => {
    try {
      await save();
    } catch (e) {
      error(t('error.failed-to-save-patient'))();
    }
  }, [save, error, t]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: handleSave,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  if (isLoading) return <BasicSpinner />;
  return (
    <Box flex={1} display="flex" justifyContent="center">
      <Box style={{ maxWidth: 1200, flex: 1 }}>{JsonForm}</Box>
      <Footer
        documentName={documentName}
        isSaving={isSaving}
        isDirty={isDirty}
        validationError={validationError}
        inputData={inputData}
        showSaveConfirmation={showSaveConfirmation}
      />
    </Box>
  );
};
