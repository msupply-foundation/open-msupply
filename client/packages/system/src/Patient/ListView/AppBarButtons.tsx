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

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-patient')}
          disabled={!userHasPermission(UserPermission.PatientMutate)}
          onClick={() => setCreateModalOpen(true)}
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
