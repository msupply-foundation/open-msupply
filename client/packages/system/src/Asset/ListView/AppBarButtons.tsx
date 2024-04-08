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
  ButtonWithIcon,
  UploadIcon,
  ToggleState,
} from '@openmsupply-client/common';
import { useAssetData } from '../api';
import { assetCatalogueItemsListToCsv } from '../utils';

export const AppBarButtonsComponent = ({
  importModalController,
}: {
  importModalController: ToggleState;
}) => {
  const { success, error } = useNotification();
  const t = useTranslation(['catalogue']);
  const { fetchAsync, isLoading } = useAssetData.document.listAll();

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = assetCatalogueItemsListToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.asset-categories'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<UploadIcon />}
          label={t('button.import')}
          onClick={importModalController.toggleOn}
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
