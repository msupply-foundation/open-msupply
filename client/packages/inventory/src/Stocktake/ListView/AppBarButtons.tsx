import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  FileUtils,
  SortBy,
  LoadingButton,
  ToggleState,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { CreateStocktakeButton } from './CreateStocktakeButton';
import { StocktakeRowFragment, useStocktake } from '../api';
import { stocktakesToCsv } from '../../utils';

export const AppBarButtons: FC<{
  modalController: ToggleState;
  sortBy: SortBy<StocktakeRowFragment>;
}> = ({ modalController, sortBy }) => {
  const { success, error } = useNotification();
  const t = useTranslation(['distribution', 'common']);
  const { isLoading, fetchAsync } = useStocktake.document.listAll(sortBy);

  const csvExport = async () => {
    const data = await fetchAsync();
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
        <CreateStocktakeButton modalController={modalController} />
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
