import React, { FC, useState } from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FileUtils,
  LoadingButton,
  SortBy,
  useAuthContext,
  UserPermission,
  useDisabledNotificationToast,
} from '@openmsupply-client/common';
import { PatientRowFragment, usePatient } from '../api';
import { patientsToCsv } from '../utils';
import { CreatePatientModal } from '../CreatePatientModal';

export const AppBarButtons: FC<{ sortBy: SortBy<PatientRowFragment> }> = ({
  sortBy,
}) => {
  const { success, error } = useNotification();
  const t = useTranslation('dispensary');
  const { isLoading, mutateAsync } = usePatient.document.listAll(sortBy);
  const { userHasPermission } = useAuthContext();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const showPermissionDenied = useDisabledNotificationToast();

  const csvExport = async () => {
    const data = await mutateAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = patientsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.patients'));
    success(t('success'))();
  };

  const onCreatePatient = () => {
    if (!userHasPermission(UserPermission.PatientMutate)) {
      showPermissionDenied();
      return;
    }
    setCreateModalOpen(true);
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-patient')}
          onClick={onCreatePatient}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={csvExport}
          isLoading={isLoading}
        >
          {t('button.export', { ns: 'common' })}
        </LoadingButton>
      </Grid>

      {createModalOpen ? (
        <CreatePatientModal onClose={() => setCreateModalOpen(false)} />
      ) : null}
    </AppBarButtonsPortal>
  );
};
