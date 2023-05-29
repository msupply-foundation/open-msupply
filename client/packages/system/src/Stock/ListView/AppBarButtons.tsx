import React, { FC } from 'react';
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
import { StockLineRowFragment, useStock } from '../api';
import { stockLinesToCsv } from '../../utils';
import { EditStockLineButton } from './EditStockLineButton';

export const AppBarButtonsComponent: FC<{
  selected: StockLineRowFragment | null;
}> = ({ selected }) => {
  const { success, error } = useNotification();
  const t = useTranslation(['distribution', 'common']);
  const { fetchAsync, isLoading } = useStock.line.listAll({
    key: 'itemName',
    direction: 'asc',
  });

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = stockLinesToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.stock'));
    success(t('success'))();
  };

  return (
    <>
      <AppBarButtonsPortal>
        <Grid container gap={1}>
          <EditStockLineButton selected={selected} />
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
    </>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
