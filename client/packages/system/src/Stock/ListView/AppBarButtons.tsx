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
  PlusCircleIcon,
  ButtonWithIcon,
} from '@openmsupply-client/common';
import { useStock } from '../api';
import { stockLinesToCsv } from '../../utils';

export const AppBarButtonsComponent = () => {
  const { success, error } = useNotification();
  const t = useTranslation('inventory');
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

  const openModal = () => {};

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-stock')}
          onClick={openModal}
        />
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
