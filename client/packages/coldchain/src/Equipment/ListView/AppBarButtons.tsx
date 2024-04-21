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
  useDisabledNotificationToast,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { assetsToCsv } from '../utils';
import { AddFromScannerButton } from './AddFromScannerButton';

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
  const { userHasPermission } = useAuthContext();
  const showDisabledNotification = useDisabledNotificationToast(
    t('error.no-asset-create-permission')
  );

  const onAdd = () => {
    if (userHasPermission(UserPermission.AssetMutate))
      modalController.toggleOn();
    else showDisabledNotification();
  };
  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = assetsToCsv(data.nodes, t);
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
