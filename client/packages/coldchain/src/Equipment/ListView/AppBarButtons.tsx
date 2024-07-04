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
  PlusCircleIcon,
  ToggleState,
  UploadIcon,
  UserPermission,
  useCallbackWithPermission,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { assetsToCsv } from '../utils';
import { AddFromScannerButton } from './AddFromScannerButton';
import { useAssetData } from '@openmsupply-client/system';

export const AppBarButtonsComponent = ({
  importModalController,
  modalController,
}: {
  importModalController: ToggleState;
  modalController: ToggleState;
}) => {
  const { success, error } = useNotification();
  const t = useTranslation('coldchain');
  const { fetchAsync, isLoading } = useAssets.document.listAll();
  const { data: properties } = useAssetData.utils.properties();

  const onAdd = useCallbackWithPermission(
    UserPermission.AssetMutate,
    modalController.toggleOn,
    t('error.no-asset-create-permission')
  );

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = assetsToCsv(data.nodes, t, properties?.map(p => p.key) ?? []);
    FileUtils.exportCSV(csv, t('filename.cold-chain-equipment'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<UploadIcon />}
          label={t('button.upload-assets')}
          onClick={importModalController.toggleOn}
        />
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-asset')}
          onClick={onAdd}
        />
        <AddFromScannerButton />
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
