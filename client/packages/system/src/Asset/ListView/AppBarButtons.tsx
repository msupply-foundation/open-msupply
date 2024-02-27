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
import { useAssets } from '../api';
import { assetCategoryListItemsToCsv } from '../utils';

export const AppBarButtonsComponent = () => {
  const { success, error } = useNotification();
  const t = useTranslation(['catalogue']);
  const { fetchAsync, isLoading } = useAssets.document.listAll();

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = assetCategoryListItemsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.asset-categories'));
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
