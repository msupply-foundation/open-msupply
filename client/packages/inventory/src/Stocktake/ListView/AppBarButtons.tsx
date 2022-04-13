import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  FileUtils,
  SortBy,
  LoadingButton,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { CreateStocktakeButton } from './CreateStocktakeButton';
import { StocktakeRowFragment, useStocktakesAll } from '../api';
import { stocktakesToCsv } from '../../utils';

export const AppBarButtons: FC<{
  sortBy: SortBy<StocktakeRowFragment>;
}> = ({ sortBy }) => {
  const { success, error } = useNotification();
  const t = useTranslation(['distribution', 'common']);
  const { isLoading, mutateAsync } = useStocktakesAll(sortBy);

  const csvExport = async () => {
    const data = await mutateAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = stocktakesToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.stocktakes'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <CreateStocktakeButton />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={isLoading}
          onClick={csvExport}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};
