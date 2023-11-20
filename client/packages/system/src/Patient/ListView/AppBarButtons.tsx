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
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { PatientRowFragment } from '../api';
import { patientsToCsv } from '../utils';
import { CreatePatientModal } from '../CreatePatientModal';

export const AppBarButtons: FC<{
  patients?: PatientRowFragment[];
  isLoading: boolean;
}> = ({ patients, isLoading }) => {
  const { success, error } = useNotification();
  const t = useTranslation('dispensary');
  const { userHasPermission } = useAuthContext();
  const [open, setOpen] = useState(false);

  const csvExport = async () => {
    if (!patients || !patients.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = patientsToCsv(patients, t);
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
          onClick={() => setOpen(true)}
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

      {open ? <CreatePatientModal onClose={() => setOpen(false)} /> : null}
    </AppBarButtonsPortal>
  );
};
