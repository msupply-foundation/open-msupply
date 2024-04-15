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
  InfoIcon,
  useIsCentralServerApi,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useAssetData } from '../api';
import { assetCatalogueItemsListToCsv } from '../utils';

export const AppBarButtonsComponent = ({
  importModalController,
}: {
  importModalController: ToggleState;
}) => {
  const isCentralServer = useIsCentralServerApi();
  const { success, error } = useNotification();
  const t = useTranslation(['catalogue']);
  const navigate = useNavigate();

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
  const path = RouteBuilder.create(AppRoute.Catalogue)
    .addPart(AppRoute.Assets)
    .addPart(AppRoute.LogReasons)
    .build();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        {isCentralServer && (
          <ButtonWithIcon
            Icon={<UploadIcon />}
            label={t('button.import')}
            onClick={importModalController.toggleOn}
          />
        )}
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </LoadingButton>
        {isCentralServer && (
          <LoadingButton
            isLoading={false}
            startIcon={<InfoIcon />}
            variant="outlined"
            onClick={() => {
              navigate(path);
            }}
            disabled={EnvUtils.platform === Platform.Android}
          >
            {t('button.manage-asset-log-reasons')}
          </LoadingButton>
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
