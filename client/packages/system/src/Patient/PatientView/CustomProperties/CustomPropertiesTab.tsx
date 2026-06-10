import React, { useCallback, useEffect } from 'react';
import {
  Box,
  LoadingButton,
  SaveIcon,
  useConfirmationModal,
  useNotification,
  useTranslation,
  useAuthContext,
  UserPermission,
  BasicSpinner,
} from '@openmsupply-client/common';
import { usePatient } from '../../api';
import { useDraftPatientProperties } from './useDraftPatientProperties';
import { PatientCustomProperties } from './PatientCustomProperties';

export const CustomPropertiesTab = ({
  patientId,
  onEdit,
}: {
  patientId: string;
  onEdit: (isDirty: boolean) => void;
}) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const { userHasPermission } = useAuthContext();

  const { data: patient, isLoading } = usePatient.document.get(patientId);
  const { data: definitions = [] } = usePatient.document.propertiesV2();
  const { draftProperties, updateProperty, isDirty } =
    useDraftPatientProperties(patient?.propertiesV2);
  const { mutateAsync, isPending: isSaving } =
    usePatient.document.updatePropertiesV2(patientId);

  const disabled = !userHasPermission(UserPermission.PatientMutate);

  useEffect(() => {
    onEdit(isDirty);
  }, [isDirty, onEdit]);

  const handleSave = useCallback(async () => {
    try {
      await mutateAsync({ id: patientId, propertiesV2: draftProperties });
      success(t('success.data-saved'))();
    } catch {
      error(t('error.failed-to-save-patient'))();
    }
  }, [mutateAsync, patientId, draftProperties, success, error, t]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: handleSave,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  if (isLoading) return <BasicSpinner />;

  return (
    <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
      <PatientCustomProperties
        definitions={definitions}
        draftProperties={draftProperties}
        updateProperty={updateProperty}
        disabled={disabled}
      />
      {!disabled && definitions.length > 0 && (
        <Box paddingTop={2}>
          <LoadingButton
            onClick={() => showSaveConfirmation()}
            isLoading={isSaving}
            disabled={!isDirty}
            startIcon={<SaveIcon />}
            label={t('button.save')}
            variant="contained"
          />
        </Box>
      )}
    </Box>
  );
};
