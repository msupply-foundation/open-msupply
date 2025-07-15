import React from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  LoadingButton,
  ButtonWithIcon,
  PlusCircleIcon,
  ToggleState,
  UploadIcon,
  UserPermission,
  useCallbackWithPermission,
  useIsCentralServerApi,
  useExportCSV,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { assetsToCsv } from '../utils';
import { AddFromScannerButton } from './AddFromScannerButton';
import { useAssetProperties } from '@openmsupply-client/system';

interface AppBarButtonsComponentProps {
  importModalController: ToggleState;
  modalController: ToggleState;
}

export const AppBarButtonsComponent = ({
  importModalController,
  modalController,
}: AppBarButtonsComponentProps) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const { error } = useNotification();

  const exportCSV = useExportCSV();
  const { fetchAsync, isLoading } = useAssets.document.listAll();
  const { data: properties } = useAssetProperties();

  const handleUploadAssetClick = useCallbackWithPermission(
    UserPermission.AssetMutate,
    importModalController.toggleOn,
    t('error.no-asset-import-permission')
  );

  const handleCreateAssetClick = useCallbackWithPermission(
    UserPermission.AssetMutate,
    modalController.toggleOn,
    t('error.no-asset-create-permission')
  );

  const handleCsvExportClick = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = assetsToCsv(
      data.nodes,
      t,
      properties?.map(p => p.key) ?? [],
      isCentralServer
    );
    exportCSV(csv, t('filename.cold-chain-equipment'));
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<UploadIcon />}
          label={t('button.upload-assets')}
          onClick={handleUploadAssetClick}
        />
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-asset')}
          onClick={handleCreateAssetClick}
        />
        <AddFromScannerButton />
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={handleCsvExportClick}
          label={t('button.export')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
