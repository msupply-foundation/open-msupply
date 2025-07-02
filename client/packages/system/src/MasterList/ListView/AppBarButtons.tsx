import React from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  LoadingButton,
  useExportCSV,
} from '@openmsupply-client/common';
import { masterListsToCsv } from '../../utils';
import { MasterListRowFragment } from '../api';

export const AppBarButtons = ({
  data,
}: {
  data?: MasterListRowFragment[] | null;
}) => {
  const t = useTranslation();
  const { error } = useNotification();
  const exportCSV = useExportCSV();

  const csvExport = async () => {
    if (!data || !data?.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = masterListsToCsv(data, t);
    exportCSV(csv, t('filename.master-lists'));
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
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
