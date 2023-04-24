import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  FileUtils,
  LoadingButton,
  SortBy,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useStock } from '../api';
import { stockLinesToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  sortBy: SortBy<StockLineRowFragment>;
}> = ({ sortBy }) => {
  const { success, error } = useNotification();
  const t = useTranslation(['distribution', 'common']);
  const { fetchAsync, isLoading } = useStock.line.listAll(sortBy);

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = stockLinesToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.outbounds'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
