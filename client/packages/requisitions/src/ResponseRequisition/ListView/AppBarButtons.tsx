import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  useTranslation,
  AppBarButtonsPortal,
  Grid,
  FileUtils,
  SortBy,
  LoadingButton,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';
import { ResponseRowFragment, useResponse } from '../api';
import { responsesToCsv } from '../../utils';

export const AppBarButtons: FC<{
  sortBy: SortBy<ResponseRowFragment>;
}> = ({ sortBy }) => {
  const { success, error } = useNotification();
  const t = useTranslation('common');
  const { mutateAsync, isLoading } = useResponse.document.listAll(sortBy);

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
