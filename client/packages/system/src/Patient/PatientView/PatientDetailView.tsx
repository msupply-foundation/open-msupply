import React, { useEffect } from 'react';
import {
  useConfirmationModal,
  Box,
  useTranslation,
  BasicSpinner,
  FnUtils,
  useNavigate,
  RouteBuilder,
  useUrlQuery,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { usePatientStore } from '@openmsupply-client/programs';
import { Footer } from './Footer';
import { useUpsertPatient } from '../EditPatientModal/useUpsertPatient';
import { usePrescription } from '@openmsupply-client/invoices/src/Prescriptions';

export const PatientDetailView = ({
  patientId,
  onEdit,
}: {
  patientId: string;
  onEdit: (isDirty: boolean) => void;
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { urlQuery } = useUrlQuery();
  const fromPrescription = urlQuery['previousPath'] === AppRoute.Prescription;
  const { documentName } = usePatientStore();
  const {
    create: { create: createPrescription },
  } = usePrescription();

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
    if (fromPrescription) {
      const invoice = await createPrescription({
        id: FnUtils.generateUUID(),
        patientId,
      });
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(invoice?.id ?? '')
          .build()
      );
    }
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
