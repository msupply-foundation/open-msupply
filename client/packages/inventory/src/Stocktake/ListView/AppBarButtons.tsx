import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  FileUtils,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { CreateStocktakeButton } from './CreateStocktakeButton';
import { useStocktakes } from '../api';
import { stocktakesToCsv } from '../../utils';

export const AppBarButtons: FC = () => {
  const { success, error } = useNotification();
  const t = useTranslation(['distribution', 'common']);
  const { data } = useStocktakes();

  const csvExport = () => {
    if (!data) {
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
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={csvExport}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
