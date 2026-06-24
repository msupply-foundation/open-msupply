import React, { useCallback, useEffect } from 'react';
import {
  Box,
  LoadingButton,
  NothingHere,
  PropertyV2DetailRows,
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

  if (!definitions.length) {
    return <NothingHere body={t('messages.no-properties')} />;
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
      <Box
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            width: '95%',
            minWidth: '340px',
            paddingX: '2em',
          },
          width: '600px',
          margin: '0 auto',
          paddingTop: 2,
        })}
      >
        <PropertyV2DetailRows
          definitions={definitions}
          properties={draftProperties}
          onChange={(key, value) => updateProperty({ [key]: value })}
          disabled={disabled}
        />
      </Box>
      {!disabled && (
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
