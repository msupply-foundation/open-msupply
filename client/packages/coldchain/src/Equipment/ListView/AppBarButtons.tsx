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
  useDisabledNotification,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { assetsToCsv } from '../utils';

export const AppBarButtonsComponent = ({
  modalController,
}: {
  modalController: ToggleState;
}) => {
  const { success, error } = useNotification();
  const t = useTranslation('coldchain');
  const { fetchAsync, isLoading } = useAssets.document.listAll();
  const { userHasPermission } = useAuthContext();
  const { show, DisabledNotification } = useDisabledNotification({
    title: t('auth.permission-denied'),
    message: t('error.no-asset-create-permission'),
  });

  const onAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (userHasPermission(UserPermission.AssetMutate))
      modalController.toggleOn();
    else show(e);
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
          Icon={<PlusCircleIcon />}
          label={t('button.new-asset')}
          onClick={onAdd}
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
      <DisabledNotification />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
