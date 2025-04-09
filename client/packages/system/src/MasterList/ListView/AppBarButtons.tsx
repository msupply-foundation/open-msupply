import React from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  FileUtils,
  LoadingButton,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';
import { masterListsToCsv } from '../../utils';
import { MasterListRowFragment } from '../api';

export const AppBarButtons = ({
  data,
}: {
  data?: MasterListRowFragment[] | null;
}) => {
  const t = useTranslation();
  const { success, error } = useNotification();

  const csvExport = async () => {
    if (!data || !data?.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = masterListsToCsv(data, t);
    FileUtils.exportCSV(csv, t('filename.master-lists'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          disabled={EnvUtils.platform === Platform.Android}
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={false}
          onClick={csvExport}
          label={t('button.export')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
