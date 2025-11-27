import React from 'react';
import {
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  PlusCircleIcon,
  ToggleState,
  UploadIcon,
  UserPermission,
  useCallbackWithPermission,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
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

  const getCsvData = async () => {
    const result = await fetchAsync();
    if (!result?.nodes?.length) {
      error(t('error.no-data'))();
      return null;
    }
    return assetsToCsv(
      result.nodes,
      t,
      properties?.map(p => p.key) ?? [],
      isCentralServer
    );
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
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.cold-chain-equipment')}
          isLoading={isLoading}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
