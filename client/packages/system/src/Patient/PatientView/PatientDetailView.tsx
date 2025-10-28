import React, { useEffect } from 'react';
import {
  useConfirmationModal,
  Box,
  useTranslation,
  BasicSpinner,
  Typography,
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

  const handleSave = async () => {
    await save();
  };

  useEffect(() => {
    onEdit(isDirty);
  }, [isDirty, onEdit]);

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
