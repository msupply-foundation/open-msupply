import React from 'react';
import {
  DownloadIcon,
  useNotification,
  useTranslation,
  AppBarButtonsPortal,
  Grid,
  FileUtils,
  LoadingButton,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';
import { useResponse } from '../api';
import { responsesToCsv } from '../../utils';

export const AppBarButtons = () => {
  const { success, error } = useNotification();
  const t = useTranslation();
  const { mutateAsync, isLoading } = useResponse.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });

  const csvExport = async () => {
    const data = await mutateAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = responsesToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, 'requisitions');
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          onClick={csvExport}
          variant="outlined"
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};
